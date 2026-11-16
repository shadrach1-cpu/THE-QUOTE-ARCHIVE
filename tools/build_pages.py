#!/usr/bin/env python3
"""Build a static, shareable page for every public quote and every author.

Reads the archive's public API and writes, next to index.html:

    quote/<id>/index.html     one page per public quote
    author/<id>/index.html    one page per author
    author/index.html         A-Z list of all authors
    sitemap.xml               every page above, for Google Search Console

The pages are plain HTML with title, description, canonical link, Open Graph /
Twitter card tags and schema.org data, so Google can index them and WhatsApp,
X and Facebook show a proper card when a link is shared. Each page links back
into the app (?quote=SRV-<id>).

Python 3.9+ standard library only. Usage:

    python tools/build_pages.py               # build into the repo root
    python tools/build_pages.py --out /tmp/x  # build somewhere else
    python tools/build_pages.py --force       # skip the "too few quotes" safety check

Settings (environment variables):
    QA_API_URL   default https://quote-archive-api.onrender.com/api/v1
    QA_SITE_URL  default https://shadrach1-cpu.github.io/THE-QUOTE-ARCHIVE/
"""
from __future__ import annotations

import argparse
import datetime as _dt
import html
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API = os.environ.get("QA_API_URL", "https://quote-archive-api.onrender.com/api/v1").rstrip("/")
SITE = os.environ.get("QA_SITE_URL", "https://shadrach1-cpu.github.io/THE-QUOTE-ARCHIVE/").rstrip("/") + "/"
SITE_NAME = "The Quote Archive"
FALLBACK_OG = SITE + "og-card-catalog.png"

# The public API allows 120 requests per minute per IP; stay well under it.
MIN_GAP_SECONDS = 0.6
# Refuse to replace the existing pages if the API suddenly returns far fewer quotes.
SAFETY_RATIO = 0.5

# Drawer keys used by the site (index.html CATS) and the photo library.
DRAWERS = [
    "motivation", "discipline", "success", "mindset", "growth", "focus", "resilience", "action",
    "creativity", "leadership", "courage", "gratitude", "patience", "confidence", "purpose",
    "change", "perseverance", "selfbelief", "ambition", "positivity",
]

# How each source is credited (mirrors the CREDITS table in index.html).
CREDITS = {
    "QuoteKG": ("Wikiquote via QuoteKG (L3S Research Center)", "CC BY-SA 4.0",
                "https://creativecommons.org/licenses/by-sa/4.0/"),
    "ConceptJunkie community quote file": ("Community quote collection (ConceptJunkie/quote)",
                                           "Curator's public-domain statement", "https://github.com/ConceptJunkie/quote"),
    "THE QUOTE ARCHIVE curated drawers": ("The Quote Archive curated drawers", "Archive collection", ""),
}


# --------------------------------------------------------------------------- API
_last_call = 0.0


def api_get(path: str, params: dict | None = None, *, attempts: int = 5) -> dict:
    """GET a JSON document from the API, pacing calls and retrying while the free server wakes up."""
    global _last_call
    url = API + path + ("?" + urllib.parse.urlencode(params) if params else "")
    for attempt in range(1, attempts + 1):
        wait = MIN_GAP_SECONDS - (time.monotonic() - _last_call)
        if wait > 0:
            time.sleep(wait)
        _last_call = time.monotonic()
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json",
                                                       "User-Agent": "quote-archive-page-builder/1.0"})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                raise
            retry = e.code in (429, 500, 502, 503, 504)
            err = f"HTTP {e.code}"
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            retry, err = True, str(e)
        if not retry or attempt == attempts:
            raise RuntimeError(f"API request failed: {url} ({err})")
        delay = min(60, 10 * attempt)
        print(f"  {err} from {path}; retrying in {delay}s ({attempt}/{attempts - 1})", flush=True)
        time.sleep(delay)
    raise AssertionError("unreachable")


def fetch_quotes() -> list[dict]:
    quotes, cursor = [], None
    while True:
        params = {"limit": 100, "include": "sources"}
        if cursor:
            params["cursor"] = cursor
        page = api_get("/quotes", params)
        quotes.extend(page["items"])
        print(f"  quotes: {len(quotes):,}", flush=True)
        cursor = page.get("next_cursor")
        if not cursor:
            return quotes


def fill_missing_sources(quotes: list[dict]) -> None:
    """Older servers do not support include=sources; fetch each record instead (slow)."""
    missing = [q for q in quotes if "sources" not in q]
    if not missing:
        return
    minutes = len(missing) * MIN_GAP_SECONDS / 60
    print(f"  the API did not include sources; fetching {len(missing):,} records one by one (~{minutes:.0f} min)",
          flush=True)
    for i, q in enumerate(missing, 1):
        try:
            q["sources"] = api_get(f"/quotes/{q['id']}").get("sources", [])
        except urllib.error.HTTPError:
            q["sources"] = []
        if i % 250 == 0:
            print(f"  sources: {i:,}/{len(missing):,}", flush=True)


def fetch_photos() -> dict[str, list[dict]]:
    photos = {}
    for d in DRAWERS:
        try:
            photos[d] = api_get("/images", {"drawer": d, "limit": 300}).get("items", [])
        except Exception as e:  # photos are optional; a page without one still works
            print(f"  photos for {d} unavailable: {e}", flush=True)
            photos[d] = []
    print(f"  photos: {sum(len(v) for v in photos.values()):,}", flush=True)
    return photos


# --------------------------------------------------------------------------- helpers
def esc(s) -> str:
    return html.escape(str(s or ""), quote=True)


def clip(s: str, n: int) -> str:
    s = re.sub(r"\s+", " ", s or "").strip()
    if len(s) <= n:
        return s
    cut = s[: n - 1].rsplit(" ", 1)[0].rstrip(",;:.-—")
    return cut + "…"


def drawer_key(cat: dict) -> str:
    return re.sub(r"[^a-z]", "", str(cat.get("name") or cat.get("slug") or "").lower())


def json_ld(data: dict) -> str:
    # No raw "<" inside a <script> block (blocks "</script>" and "<!--" tricks); JSON parsers read the escaped form the same.
    return json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")


def unsplash(url: str, **params) -> str:
    if not url:
        return ""
    sep = "&" if "?" in url else "?"
    return url + sep + urllib.parse.urlencode(params)


def quote_url(qid) -> str:
    return f"{SITE}quote/{qid}/"


def author_url(aid) -> str:
    return f"{SITE}author/{aid}/"


def source_credit(q: dict) -> dict | None:
    src = (q.get("sources") or [None])[0]
    if not src:
        return None
    label, lic, lic_url = CREDITS.get(src.get("source"), (src.get("source"), src.get("license") or "", ""))
    return {"label": label, "license": lic or src.get("license") or "", "license_url": lic_url,
            "record_url": src.get("record_url") or src.get("source_home") or "", "work": src.get("work") or ""}


def pick_photo(q: dict, photos: dict[str, list[dict]]) -> dict | None:
    """Same photo for the same quote every build: its first drawer, chosen by id."""
    keys = [drawer_key(c) for c in q.get("categories") or []]
    for k in keys + ["motivation"]:
        pool = photos.get(k) or []
        if pool:
            return pool[int(q["id"]) % len(pool)]
    return None


# --------------------------------------------------------------------------- templates
def page(*, title: str, description: str, canonical: str, og_image: str, og_alt: str, og_type: str,
         schema: dict, body: str, depth: int, hero: str = "") -> str:
    up = "../" * depth
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<link rel="canonical" href="{esc(canonical)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#141a2c">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="{SITE_NAME}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{esc(canonical)}">
<meta property="og:image" content="{esc(og_image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(og_alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(description)}">
<meta name="twitter:image" content="{esc(og_image)}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%23141a2c'/%3E%3Ctext x='50' y='68' font-size='54' text-anchor='middle' fill='%23e0a83f' font-family='Georgia,serif'%3E%E2%80%9C%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;1,9..144,500&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{up}pages.css">
<script type="application/ld+json">{json_ld(schema)}</script>
</head>
<body>
<header class="bar"><a class="brand" href="{up}">“ {SITE_NAME}</a><nav><a href="{up}author/">Authors</a><a href="{up}">Open the archive</a></nav></header>
{hero}<main>
{body}
</main>
<footer>
<p>© {_dt.date.today().year} Diovu Shadrach Chinecherem · <a href="{up}">{SITE_NAME}</a> · <a href="{up}license.html">License</a></p>
<p>Third-party quotations keep their own licences; Wikiquote/QuoteKG text is shared under <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="noopener">CC BY-SA 4.0</a>.</p>
</footer>
</body>
</html>
"""


def quote_list(items: list[dict], up: str, *, show_author: bool = True) -> str:
    rows = []
    for r in items:
        who = ""
        if show_author:
            who = f' <span class="by">— {esc((r.get("author") or {}).get("name") or "Unknown author")}</span>'
        rows.append(f'<li><a href="{up}quote/{r["id"]}/">“{esc(r["text"])}”</a>{who}</li>')
    return '<ul class="qlist">' + "".join(rows) + "</ul>"


def render_quote(q: dict, related: list[dict], photo: dict | None) -> str:
    up = "../../"
    text = re.sub(r"\s+", " ", q["text"]).strip()
    author = q.get("author")
    name = (author or {}).get("name") or "Unknown author"
    cats = q.get("categories") or []
    credit = source_credit(q)

    title = f"“{clip(text, 70)}” — {name} | {SITE_NAME}"
    description = clip(f"“{text}” — {name}. Read the source, share it, or make a quote card.", 200)
    og_image = unsplash(photo["url"], w=1200, h=630, fit="crop", q=80, fm="jpg") if photo else FALLBACK_OG

    author_html = (f'<a href="{up}author/{author["id"]}/">{esc(name)}</a>' if author else esc(name))
    cat_html = "".join(f'<a class="chip" href="{up}?drawer={esc(drawer_key(c))}">{esc(c["name"])}</a>' for c in cats)

    src_html = ""
    if credit:
        rec = (f' · <a href="{esc(credit["record_url"])}" rel="noopener nofollow">source page</a>'
               if credit["record_url"] else "")
        lic = (f'<a href="{esc(credit["license_url"])}" rel="noopener license">{esc(credit["license"])}</a>'
               if credit["license_url"] else esc(credit["license"]))
        work = f' · from “{esc(credit["work"])}”' if credit["work"] else ""
        src_html = f'<p class="source">Source: {esc(credit["label"])}{work}{rec}<br>Licence: {lic}</p>'
    status = q.get("attribution_status")
    if status and status not in ("verified",):
        src_html += '<p class="source muted">Attribution as given by the source; not independently verified.</p>'

    hero = ""
    if photo:
        c = photo["credit"]
        hero = (f'<div class="hero" style="background-color:{esc(photo.get("color") or "#141a2c")};'
                f'background-image:url(\'{esc(unsplash(photo["url"], w=1600, q=70, fm="jpg", fit="crop"))}\')">'
                f'<p class="photo-credit">Photo by <a href="{esc(c["profile_url"])}" rel="noopener">{esc(c["name"])}</a>'
                f' on <a href="{esc(c["provider_url"])}" rel="noopener">Unsplash</a></p></div>\n')

    body = f"""<article class="card">
<blockquote><p>“{esc(text)}”</p></blockquote>
<p class="who">— {author_html}</p>
<div class="chips">{cat_html}</div>
<div class="actions"><a class="btn" href="{up}?quote=SRV-{q["id"]}">Open in the archive · make a quote card</a></div>
{src_html}
</article>"""
    if related:
        heading = f"More from {esc(name)}" if author and any(
            (r.get("author") or {}).get("id") == author["id"] for r in related) else "Related quotes"
        body += f'\n<section><h2>{heading}</h2>{quote_list(related, up)}</section>'

    schema = {
        "@context": "https://schema.org",
        "@type": "Quotation",
        "@id": quote_url(q["id"]),
        "url": quote_url(q["id"]),
        "text": text,
        "inLanguage": q.get("language") or "en",
        "spokenByCharacter": {"@type": "Person", "name": name, **({"url": author_url(author["id"])} if author else {})},
        "about": [c["name"] for c in cats],
        "isPartOf": {"@type": "WebSite", "name": SITE_NAME, "url": SITE},
    }
    if credit and credit["license_url"]:
        schema["license"] = credit["license_url"]
    return page(title=title, description=description, canonical=quote_url(q["id"]), og_image=og_image,
                og_alt=f"Quote by {name}", og_type="article", schema=schema, body=body, depth=2, hero=hero)


def render_author(a: dict, items: list[dict], photo: dict | None) -> str:
    up = "../../"
    n = len(items)
    title = f"{a['name']} quotes ({n}) | {SITE_NAME}"
    first = clip(items[0]["text"], 110) if items else ""
    description = clip(f"{n} quote{'s' if n != 1 else ''} by {a['name']}, with sources. “{first}”", 200)
    og_image = unsplash(photo["url"], w=1200, h=630, fit="crop", q=80, fm="jpg") if photo else FALLBACK_OG
    body = (f'<h1>{esc(a["name"])}</h1>\n<p class="lede">{n:,} quote{"s" if n != 1 else ""} in {SITE_NAME}. '
            f'<a href="{up}?q={esc(urllib.parse.quote(a["name"]))}">Search in the archive</a></p>\n'
            + quote_list(items, up, show_author=False))
    schema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": author_url(a["id"]),
        "url": author_url(a["id"]),
        "name": f"{a['name']} quotes",
        "about": {"@type": "Person", "name": a["name"]},
        "isPartOf": {"@type": "WebSite", "name": SITE_NAME, "url": SITE},
        "hasPart": [{"@type": "Quotation", "url": quote_url(r["id"]), "text": r["text"]} for r in items[:50]],
    }
    return page(title=title, description=description, canonical=author_url(a["id"]), og_image=og_image,
                og_alt=f"Quotes by {a['name']}", og_type="profile", schema=schema, body=body, depth=2)


def sort_key(name: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", name.lower()).strip() or "~"


def render_author_index(authors: list[dict]) -> str:
    up = "../"
    groups: dict[str, list[dict]] = {}
    for a in sorted(authors, key=lambda a: sort_key(a["name"])):
        ch = sort_key(a["name"])[0].upper()
        groups.setdefault(ch if ch.isalpha() else "#", []).append(a)
    nav = " ".join(f'<a href="#l-{esc(ch)}">{esc(ch)}</a>' for ch in groups)
    parts = []
    for ch, rows in groups.items():
        lis = "".join(f'<li><a href="{a["id"]}/">{esc(a["name"])}</a> <span class="by">{a["count"]}</span></li>'
                      for a in rows)
        parts.append(f'<h2 id="l-{esc(ch)}">{esc(ch)}</h2><ul class="alist">{lis}</ul>')
    total = sum(a["count"] for a in authors)
    body = (f'<h1>Authors</h1>\n<p class="lede">{len(authors):,} authors, {total:,} quotes.</p>\n'
            f'<p class="az">{nav}</p>\n' + "\n".join(parts))
    schema = {"@context": "https://schema.org", "@type": "CollectionPage", "url": SITE + "author/",
              "name": f"Authors in {SITE_NAME}", "isPartOf": {"@type": "WebSite", "name": SITE_NAME, "url": SITE}}
    return page(title=f"All authors A–Z | {SITE_NAME}",
                description=f"Browse {len(authors):,} authors and {total:,} motivational quotes, A to Z.",
                canonical=SITE + "author/", og_image=FALLBACK_OG, og_alt=SITE_NAME, og_type="website",
                schema=schema, body=body, depth=1)


def render_sitemap(urls: list[str]) -> str:
    today = _dt.date.today().isoformat()
    rows = "\n".join(f"  <url><loc>{esc(u)}</loc><lastmod>{today}</lastmod></url>" for u in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{rows}\n</urlset>\n'


# --------------------------------------------------------------------------- build
def related_for(q: dict, by_author: dict, by_drawer: dict, limit: int = 6) -> list[dict]:
    out, seen = [], {q["id"]}
    aid = (q.get("author") or {}).get("id")
    pools = []
    if aid:
        pools.append(by_author.get(aid, []))
    for c in q.get("categories") or []:
        pools.append(by_drawer.get(drawer_key(c), []))
    for pool in pools:
        if not pool:
            continue
        # Start next to this quote so neighbouring pages link to different quotes.
        start = next((i for i, r in enumerate(pool) if r["id"] == q["id"]), 0)
        for r in pool[start + 1:] + pool[:start]:
            if r["id"] not in seen:
                out.append(r)
                seen.add(r["id"])
                if len(out) >= limit:
                    return out
    return out


def existing_quote_count(root: Path) -> int:
    d = root / "quote"
    return sum(1 for p in d.iterdir() if p.is_dir()) if d.is_dir() else 0


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def build(out: Path, force: bool = False) -> dict:
    print(f"API: {API}\nSite: {SITE}", flush=True)
    quotes = fetch_quotes()
    fill_missing_sources(quotes)
    photos = fetch_photos()

    if not quotes:
        raise SystemExit("The API returned no quotes; nothing was changed.")
    before = existing_quote_count(out)
    if before and len(quotes) < before * SAFETY_RATIO and not force:
        raise SystemExit(f"The API returned {len(quotes):,} quotes but {before:,} pages exist. "
                         "Nothing was changed. Re-run with --force if this drop is intended.")

    quotes.sort(key=lambda q: q["id"])
    by_author: dict[int, list[dict]] = {}
    by_drawer: dict[str, list[dict]] = {}
    for q in quotes:
        if q.get("author"):
            by_author.setdefault(q["author"]["id"], []).append(q)
        for c in q.get("categories") or []:
            by_drawer.setdefault(drawer_key(c), []).append(q)

    # Build into a staging folder, then swap, so a failed run never leaves half a site.
    stage = out / ".pages-build"
    if stage.exists():
        shutil.rmtree(stage)
    for q in quotes:
        write(stage / "quote" / str(q["id"]) / "index.html",
              render_quote(q, related_for(q, by_author, by_drawer), pick_photo(q, photos)))
    authors = []
    for aid, items in by_author.items():
        a = {"id": aid, "name": items[0]["author"]["name"], "count": len(items)}
        authors.append(a)
        write(stage / "author" / str(aid) / "index.html", render_author(a, items, pick_photo(items[0], photos)))
    write(stage / "author" / "index.html", render_author_index(authors))

    urls = [SITE, SITE + "author/"] + [author_url(a["id"]) for a in sorted(authors, key=lambda a: a["id"])] \
        + [quote_url(q["id"]) for q in quotes]
    write(stage / "sitemap.xml", render_sitemap(urls))

    for name in ("quote", "author"):
        if (out / name).exists():
            shutil.rmtree(out / name)
        (stage / name).rename(out / name)
    (stage / "sitemap.xml").replace(out / "sitemap.xml")
    shutil.rmtree(stage)

    summary = {"quotes": len(quotes), "authors": len(authors), "previous_quote_pages": before,
               "photos": sum(len(v) for v in photos.values()), "sitemap_urls": len(urls)}
    print("Done: " + ", ".join(f"{k}={v:,}" for k, v in summary.items()), flush=True)
    return summary


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent),
                    help="site folder to write into (default: the repo root)")
    ap.add_argument("--force", action="store_true", help="skip the safety check on a large drop in quotes")
    args = ap.parse_args(argv)
    out = Path(args.out)
    if not (out / "index.html").exists() and not args.force:
        sys.exit(f"{out} does not look like the site folder (no index.html).")
    build(out, args.force)


if __name__ == "__main__":
    main()
