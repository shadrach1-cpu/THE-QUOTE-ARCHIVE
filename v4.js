/* THE QUOTE ARCHIVE — V4 features (loaded after the main script) */
(function(){
'use strict';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rd = (k, d) => { try{ return safeReadJSON(k, d); }catch{ return d; } };
const wr = (k, v) => { try{ safeWriteJSON(k, v); }catch{} };
const K = {ui:'dqa_v4_ui', notes:'dqa_v4_notes', cols:'dqa_v4_collections', mine:'dqa_v4_myquotes', game:'dqa_v4_game'};
const clean = (o, d) => (o && typeof o === 'object' && !Array.isArray(o)) ? o : d;

/* ---------- overlay helper ---------- */
const overlays = [];
function makeOverlay(id, title, bodyHTML, wide){
  const o = document.createElement('div');
  o.className = 'v4-overlay'; o.id = id; o.setAttribute('role','dialog'); o.setAttribute('aria-modal','true'); o.setAttribute('aria-label', title);
  o.innerHTML = `<div class="v4-panel"${wide ? ' style="width:min(820px,100%)"' : ''}><div class="v4-head"><h2>${esc(title)}</h2><button class="icon-btn" type="button" data-close>✕ Close</button></div><div class="v4-body">${bodyHTML}</div></div>`;
  document.body.appendChild(o);
  o.addEventListener('click', e => { if(e.target === o || e.target.closest('[data-close]')) closeOverlay(o); });
  overlays.push(o);
  return o;
}
let lastFocus = null;
function openOverlay(o){
  overlays.forEach(x => { if(x !== o) x.classList.remove('open'); });
  lastFocus = document.activeElement; o.classList.add('open'); document.body.style.overflow = 'hidden';
  const f = o.querySelector('input,textarea,select,button:not([data-close])') || o.querySelector('[data-close]'); if(f) setTimeout(() => f.focus(), 30);
}
function closeOverlay(o){
  o.classList.remove('open');
  if(!document.querySelector('.v4-overlay.open, .quote-detail-overlay.open, .focus-overlay.open, .achieve-overlay.open, .post-studio-overlay.open')) document.body.style.overflow = '';
  try{ lastFocus && lastFocus.focus && lastFocus.focus(); }catch{}
}
document.addEventListener('keydown', e => {
  if(e.key === 'Escape'){ const o = overlays.find(x => x.classList.contains('open')); if(o){ closeOverlay(o); e.stopPropagation(); } }
}, true);

/* ============ 1. APPEARANCE ============ */
const ACCENTS = {gold:['#e0a83f','#b9822a','Gold'], ocean:['#4aa3d9','#2f78a6','Ocean'], rose:['#e07a9a','#b94f74','Rose'], emerald:['#4cc38a','#2e8f62','Emerald'], violet:['#a98bf0','#7656c9','Violet'], ember:['#f0803c','#c25a1b','Ember']};
const ui = Object.assign({accent:'gold', size:'normal', dys:false, calm:false, hc:false, layout:'cards'}, clean(rd(K.ui, {}), {}));
function applyUI(){
  const a = ACCENTS[ui.accent] || ACCENTS.gold;
  document.body.style.setProperty('--gold', a[0]); document.body.style.setProperty('--gold-deep', a[1]);
  document.body.style.setProperty('--focus', `0 0 0 3px ${a[0]}88`);
  document.documentElement.classList.toggle('v4-big', ui.size === 'big'); document.documentElement.classList.toggle('v4-bigger', ui.size === 'bigger');
  document.body.classList.toggle('v4-dys', !!ui.dys); document.body.classList.toggle('v4-calm', !!ui.calm); document.body.classList.toggle('v4-hc', !!ui.hc);
  if(ui.dys && !$('#v4Lexend')){ const l = document.createElement('link'); l.id = 'v4Lexend'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Lexend:wght@400;600&display=swap'; document.head.appendChild(l); }
  const g = $('#grid'); if(g){ g.classList.toggle('v4-compact', ui.layout === 'compact'); g.classList.toggle('v4-list', ui.layout === 'list'); }
  const g2 = $('#genGrid'); if(g2){ g2.classList.toggle('v4-compact', ui.layout === 'compact'); g2.classList.toggle('v4-list', ui.layout === 'list'); }
}
function saveUI(){ wr(K.ui, ui); applyUI(); renderAppearance(); }
const appearance = makeOverlay('v4Appearance', 'Appearance & accessibility', '<div id="v4AppBody"></div>');
function renderAppearance(){
  const b = $('#v4AppBody'); if(!b) return;
  b.innerHTML = `<span class="v4-label">Accent colour</span><div class="v4-row">${Object.keys(ACCENTS).map(k => `<button class="v4-swatch" type="button" data-accent="${k}" style="background:${ACCENTS[k][0]}" aria-label="${ACCENTS[k][2]}" aria-pressed="${ui.accent === k}"></button>`).join('')}</div>
  <span class="v4-label">Text size</span><div class="v4-row">${[['normal','Normal'],['big','Large'],['bigger','Extra large']].map(o => `<button class="v4-chip" type="button" data-size="${o[0]}" aria-pressed="${ui.size === o[0]}">${o[1]}</button>`).join('')}</div>
  <span class="v4-label">Card layout</span><div class="v4-row">${[['cards','Cards with art'],['compact','Compact grid'],['list','Text list']].map(o => `<button class="v4-chip" type="button" data-layout="${o[0]}" aria-pressed="${ui.layout === o[0]}">${o[1]}</button>`).join('')}</div>
  <span class="v4-label">Comfort</span><div class="v4-row">
    <button class="v4-chip" type="button" data-tog="dys" aria-pressed="${!!ui.dys}">Easy-read font</button>
    <button class="v4-chip" type="button" data-tog="calm" aria-pressed="${!!ui.calm}">Reduce motion</button>
    <button class="v4-chip" type="button" data-tog="hc" aria-pressed="${!!ui.hc}">Higher contrast</button></div>
  <p class="v4-meta">Saved in this browser only.</p>`;
}
appearance.addEventListener('click', e => {
  const t = e.target.closest('button'); if(!t) return;
  if(t.dataset.accent){ ui.accent = t.dataset.accent; saveUI(); }
  else if(t.dataset.size){ ui.size = t.dataset.size; saveUI(); }
  else if(t.dataset.layout){ ui.layout = t.dataset.layout; saveUI(); }
  else if(t.dataset.tog){ ui[t.dataset.tog] = !ui[t.dataset.tog]; saveUI(); }
});

/* ============ 2. NOTES / COLLECTIONS / MY QUOTES / BACKUP ============ */
let notes = clean(rd(K.notes, {}), {});
let cols = clean(rd(K.cols, {}), {});
let mine = Array.isArray(rd(K.mine, [])) ? rd(K.mine, []) : [];
const saveNotes = () => wr(K.notes, notes), saveCols = () => wr(K.cols, cols), saveMine = () => wr(K.mine, mine);
const quoteById = id => { try{ return findQuote(id) || mine.find(m => m.id === id) || null; }catch{ return null; } };
const snip = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const space = makeOverlay('v4Space', 'My Space', '<div class="v4-tabs" id="v4SpaceTabs"></div><div id="v4SpaceBody"></div>', true);
let spaceTab = 'collections';
function renderSpace(){
  $('#v4SpaceTabs').innerHTML = [['collections','Collections'],['notes','Notes'],['mine','My quotes'],['backup','Backup']].map(t => `<button class="v4-chip" type="button" data-stab="${t[0]}" aria-pressed="${spaceTab === t[0]}">${t[1]}</button>`).join('');
  const b = $('#v4SpaceBody');
  if(spaceTab === 'collections'){
    const names = Object.keys(cols);
    b.innerHTML = `<div class="v4-row"><input class="v4-input" id="v4NewCol" maxlength="40" placeholder="New collection name (e.g. Monday motivation)" style="flex:1"><button class="btn primary" type="button" id="v4AddCol">Create</button></div>
    ${names.length ? names.map(n => `<div class="v4-item"><strong>${esc(n)}</strong> <span class="v4-meta">· ${cols[n].length} quote${cols[n].length === 1 ? '' : 's'}</span>
      ${cols[n].map(id => { const q = quoteById(id); return q ? `<div class="v4-row" style="align-items:center"><span style="flex:1;min-width:160px">${esc(snip(q.quote, 90))}</span><button type="button" class="btn" data-open="${esc(id)}">Open</button><button type="button" class="btn" data-colrm="${esc(n)}|${esc(id)}">Remove</button></div>` : ''; }).join('')}
      <div class="v4-row"><button type="button" class="btn" data-colpost="${esc(n)}">Make a post of a random one</button><button type="button" class="btn" data-colcopy="${esc(n)}">Copy all</button><button type="button" class="btn" data-coldel="${esc(n)}">Delete collection</button></div></div>`).join('') : '<p class="v4-meta">No collections yet. Open any quote and use “Add to collection”.</p>'}`;
  } else if(spaceTab === 'notes'){
    const ids = Object.keys(notes).filter(id => notes[id]);
    b.innerHTML = ids.length ? ids.map(id => { const q = quoteById(id); return `<div class="v4-item"><q>${esc(q ? snip(q.quote, 120) : id)}</q>${esc(notes[id])}<div class="v4-row"><button type="button" class="btn" data-open="${esc(id)}">Open</button><button type="button" class="btn" data-notedel="${esc(id)}">Delete note</button></div></div>`; }).join('') : '<p class="v4-meta">No notes yet. Open any quote and write what it means to you.</p>';
  } else if(spaceTab === 'mine'){
    b.innerHTML = `<span class="v4-label">Add your own quote</span><textarea id="v4MyText" maxlength="400" placeholder="Type your own words…"></textarea><input class="v4-input" id="v4MyAuthor" maxlength="60" placeholder="Author (optional — your name?)" style="margin-top:8px"><div class="v4-row"><button class="btn primary" type="button" id="v4MyAdd">Save quote</button></div>
    ${mine.map(m => `<div class="v4-item"><q>${esc(m.quote)}</q><small>${esc(m.author || '')}</small><div class="v4-row"><button type="button" class="btn" data-mypost="${esc(m.id)}">Make post image</button><button type="button" class="btn" data-mycopy="${esc(m.id)}">Copy</button><button type="button" class="btn" data-mydel="${esc(m.id)}">Delete</button></div></div>`).join('')}`;
  } else {
    b.innerHTML = `<p class="v4-meta">Everything lives in this browser. Download a backup to move to another device or keep it safe: favourites, notes, collections, your quotes, stats and settings.</p>
    <div class="v4-row"><button class="btn primary" type="button" id="v4Export">⬇ Download backup (.json)</button><label class="btn" style="cursor:pointer">⬆ Restore backup<input type="file" id="v4Import" accept="application/json,.json" hidden></label></div><p class="v4-meta" id="v4BackupMsg"></p>`;
  }
}
space.addEventListener('click', e => {
  const t = e.target.closest('button'); if(!t) return;
  if(t.dataset.stab){ spaceTab = t.dataset.stab; renderSpace(); return; }
  if(t.id === 'v4AddCol'){ const n = $('#v4NewCol').value.trim().slice(0, 40); if(n && !cols[n]){ cols[n] = []; saveCols(); renderSpace(); } return; }
  if(t.dataset.open){ const q = quoteById(t.dataset.open); if(q){ closeOverlay(space); openQuoteDetail(q); } return; }
  if(t.dataset.colrm){ const [n, id] = t.dataset.colrm.split('|'); if(cols[n]){ cols[n] = cols[n].filter(x => x !== id); saveCols(); renderSpace(); } return; }
  if(t.dataset.coldel){ delete cols[t.dataset.coldel]; saveCols(); renderSpace(); return; }
  if(t.dataset.colcopy){ const txt = (cols[t.dataset.colcopy] || []).map(id => quoteById(id)).filter(Boolean).map(q => `"${q.quote}" — ${q.author || 'Unattributed'}`).join('\n\n'); copyText(txt); return; }
  if(t.dataset.colpost){ const ids = cols[t.dataset.colpost] || []; const q = quoteById(ids[Math.floor(Math.random() * ids.length)]); if(q){ closeOverlay(space); openPostStudio(q); } return; }
  if(t.dataset.notedel){ delete notes[t.dataset.notedel]; saveNotes(); renderSpace(); return; }
  if(t.id === 'v4MyAdd'){
    const text = $('#v4MyText').value.trim().slice(0, 400); if(text.length < 3) return;
    const n = mine.length + 1; mine.unshift({id:'MY-' + Date.now().toString(36), quote:text, author:$('#v4MyAuthor').value.trim().slice(0, 60), category:'mine', catLabel:'My Quote', catNo:'MY·' + String(n).padStart(2, '0'), mine:true});
    saveMine(); renderSpace(); showToast('✍', 'Saved', 'Your quote is in My Space.'); return;
  }
  if(t.dataset.mypost){ const q = mine.find(m => m.id === t.dataset.mypost); if(q){ closeOverlay(space); openPostStudio(q); } return; }
  if(t.dataset.mycopy){ const q = mine.find(m => m.id === t.dataset.mycopy); if(q) copyText(`"${q.quote}"${q.author ? ' — ' + q.author : ''}`); return; }
  if(t.dataset.mydel){ mine = mine.filter(m => m.id !== t.dataset.mydel); saveMine(); renderSpace(); return; }
  if(t.id === 'v4Export'){
    const data = {app:'the-quote-archive', version:4, exported:new Date().toISOString(), data:{}};
    try{ for(let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if(k && k.startsWith('dqa_')) data.data[k] = localStorage.getItem(k); } }catch{}
    const blob = new Blob([JSON.stringify(data, null, 1)], {type:'application/json'}), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'quote-archive-backup-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    $('#v4BackupMsg').textContent = 'Backup downloaded.';
  }
});
space.addEventListener('change', e => {
  if(e.target.id !== 'v4Import') return;
  const f = e.target.files && e.target.files[0]; if(!f) return;
  const msg = $('#v4BackupMsg');
  if(f.size > 5e6){ msg.textContent = 'That file is too large to be a backup.'; return; }
  f.text().then(txt => {
    let j; try{ j = JSON.parse(txt); }catch{ msg.textContent = 'That file is not valid JSON.'; return; }
    if(!j || j.app !== 'the-quote-archive' || !j.data || typeof j.data !== 'object'){ msg.textContent = 'This is not a Quote Archive backup.'; return; }
    const keys = Object.keys(j.data).filter(k => k.startsWith('dqa_') && typeof j.data[k] === 'string');
    if(!keys.length){ msg.textContent = 'Nothing to restore in this file.'; return; }
    if(!confirm(`Restore ${keys.length} saved items? This replaces matching data on this device.`)) return;
    keys.forEach(k => { try{ localStorage.setItem(k, j.data[k]); }catch{} });
    msg.textContent = 'Restored. Reloading…'; setTimeout(() => location.reload(), 700);
  });
});

/* quote-detail extras: note, collection, read aloud */
const detailBox = $('.quote-detail');
let detailExtra = null;
function renderDetailExtras(){
  if(!detailBox || typeof detailQuote === 'undefined' || !detailQuote) return;
  if(!detailExtra){ detailExtra = document.createElement('div'); detailExtra.className = 'v4-detail-extra'; detailBox.appendChild(detailExtra); }
  const q = detailQuote, names = Object.keys(cols);
  detailExtra.innerHTML = `<span class="v4-label" style="margin-top:0">Your note</span><textarea id="v4Note" maxlength="600" placeholder="What does this mean to you?">${esc(notes[q.id] || '')}</textarea>
   <div class="v4-row"><select id="v4ColSel" aria-label="Collection" style="flex:1;min-width:140px">${names.map(n => `<option>${esc(n)}</option>`).join('')}<option value="__new">＋ New collection…</option></select><button class="btn" type="button" id="v4ColAdd">Add to collection</button><button class="btn" type="button" id="v4Speak">🔊 Read aloud</button></div>`;
}
if(typeof renderQuoteDetail === 'function'){ const orig = renderQuoteDetail; renderQuoteDetail = function(){ orig.apply(this, arguments); try{ renderDetailExtras(); }catch(err){ console.warn(err); } }; }
let noteTimer = 0;
document.addEventListener('input', e => { if(e.target.id === 'v4Note' && detailQuote){ clearTimeout(noteTimer); const v = e.target.value; noteTimer = setTimeout(() => { if(v.trim()) notes[detailQuote.id] = v; else delete notes[detailQuote.id]; saveNotes(); }, 400); } });
document.addEventListener('click', e => {
  if(e.target.id === 'v4ColAdd' && detailQuote){
    let n = $('#v4ColSel').value;
    if(n === '__new'){ n = (prompt('Name for the new collection:') || '').trim().slice(0, 40); if(!n) return; if(!cols[n]) cols[n] = []; }
    if(!cols[n]) cols[n] = [];
    if(!cols[n].includes(detailQuote.id)) cols[n].push(detailQuote.id);
    saveCols(); renderDetailExtras(); showToast('📁', 'Added', `Saved to “${n}”.`);
  }
  if(e.target.id === 'v4Speak' && detailQuote) speak(detailQuote.quote + (detailQuote.author && !/unattributed/i.test(detailQuote.author) ? '. ' + detailQuote.author : ''));
});

/* ============ 3. READ ALOUD + FOCUS EXTRAS ============ */
function speak(text){
  if(!('speechSynthesis' in window)){ showToast('🔇', 'Not supported', 'This browser cannot read aloud.'); return; }
  const synth = window.speechSynthesis;
  if(synth.speaking){ synth.cancel(); return; }
  const u = new SpeechSynthesisUtterance(String(text)); u.rate = .92; u.pitch = 1; synth.speak(u);
}
const focusControls = $('.focus-controls');
let autoTimer = 0;
if(focusControls){
  focusControls.insertAdjacentHTML('beforeend', '<button class="btn ghost v4-focus-extra" id="v4FocusRead" type="button">🔊 Read</button><button class="btn ghost v4-focus-extra" id="v4FocusAuto" type="button" aria-pressed="false">⏵ Auto</button>');
  $('#v4FocusRead').addEventListener('click', () => speak(($('#focusText') || {}).textContent));
  $('#v4FocusAuto').addEventListener('click', e => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(on)); e.currentTarget.textContent = on ? '⏸ Auto' : '⏵ Auto';
    clearInterval(autoTimer);
    if(on) autoTimer = setInterval(() => { const fo = $('#focusOverlay'); if(!fo || !fo.classList.contains('open')){ clearInterval(autoTimer); const b = $('#v4FocusAuto'); b.setAttribute('aria-pressed', 'false'); b.textContent = '⏵ Auto'; return; } $('#focusNext').click(); }, 12000);
  });
}

/* ============ 4. INSIGHTS ============ */
const insights = makeOverlay('v4Insights', 'Your insights', '<div id="v4InsBody"></div>');
function renderInsights(){
  const perCat = {}; let favN = 0;
  try{ favorites.forEach(id => { const q = quoteById(id); if(q){ favN++; perCat[q.category] = (perCat[q.category] || 0) + 1; } }); }catch{}
  const rows = Object.keys(perCat).sort((a, b) => perCat[b] - perCat[a]).slice(0, 8), max = rows.length ? perCat[rows[0]] : 1;
  const st = (typeof stats !== 'undefined' && stats) || {};
  const label = k => { try{ return (CATS.find(c => c.key === k) || {}).label || k; }catch{ return k; } };
  const streak = (typeof currentStreak !== 'undefined') ? currentStreak : 0;
  $('#v4InsBody').innerHTML = `<div class="v4-stat"><div><b>${favN}</b><span>favourites</span></div><div><b>${streak || 0}</b><span>day streak</span></div><div><b>${st.downloads || 0}</b><span>post images saved</span></div><div><b>${st.weaves || 0}</b><span>quotes generated</span></div><div><b>${Object.keys(notes).length}</b><span>notes</span></div><div><b>${Object.keys(cols).length}</b><span>collections</span></div></div>
  <span class="v4-label">Favourites by drawer</span>${rows.length ? rows.map(k => `<div class="v4-bar"><span>${esc(label(k))}</span><span class="track"><i style="width:${Math.max(6, perCat[k] / max * 100)}%"></i></span><b>${perCat[k]}</b></div>`).join('') : '<p class="v4-meta">Favourite a few quotes and your taste profile appears here.</p>'}
  ${rows.length ? `<p class="v4-meta">Your most-loved drawer is <strong>${esc(label(rows[0]))}</strong>.</p>` : ''}`;
}

/* ============ 5. QUOTE GAME (fill the missing word) ============ */
const game = makeOverlay('v4Game', 'Missing word game', '<div id="v4GameBody"></div>');
const gs = Object.assign({best:0, played:0}, clean(rd(K.game, {}), {}));
let round = null, gScore = 0, gRound = 0;
const GAME_LEN = 6;
function wordsPool(){ const s = new Set(); quotes.slice(0, 1200).forEach(q => q.quote.split(/\s+/).forEach(w => { w = w.replace(/[^A-Za-z'-]/g, ''); if(w.length >= 5) s.add(w.toLowerCase()); })); return Array.from(s); }
let pool = null;
function newRound(){
  pool = pool || wordsPool();
  for(let tries = 0; tries < 60; tries++){
    const q = quotes[Math.floor(Math.random() * quotes.length)]; if(!q || q.generated) continue;
    const toks = q.quote.split(/\s+/); const idxs = toks.map((w, i) => ({w:w.replace(/[^A-Za-z'-]/g, ''), i})).filter(o => o.w.length >= 5 && o.i > 0 && o.i < toks.length - 0);
    if(toks.length < 6 || !idxs.length) continue;
    const pickd = idxs[Math.floor(Math.random() * idxs.length)], ans = pickd.w.toLowerCase();
    const opts = new Set([ans]); let g = 0; while(opts.size < 4 && g++ < 400){ const w = pool[Math.floor(Math.random() * pool.length)]; if(Math.abs(w.length - ans.length) <= 2 && w !== ans) opts.add(w); }
    if(opts.size < 4) continue;
    const display = toks.map((w, i) => i === pickd.i ? w.replace(pickd.w, '<mark>＿＿＿＿</mark>') : esc(w).replace(/&amp;/g, '&')).join(' ').replace(/<mark>＿＿＿＿<\/mark>/, '<mark>＿＿＿＿</mark>');
    const parts = toks.map((w, i) => i === pickd.i ? '\u0000' + w.replace(pickd.w, '\u0001') : esc(w));
    round = {q, ans, opts:Array.from(opts).sort(() => Math.random() - .5), html:parts.join(' ').replace('\u0000', '').replace('\u0001', '<mark>＿＿＿＿</mark>')};
    return;
  }
}
function renderGame(){
  const b = $('#v4GameBody');
  if(gRound >= GAME_LEN){
    if(gScore > gs.best){ gs.best = gScore; } gs.played++; wr(K.game, gs);
    b.innerHTML = `<div class="v4-stat"><div><b>${gScore}/${GAME_LEN}</b><span>this round</span></div><div><b>${gs.best}</b><span>best</span></div><div><b>${gs.played}</b><span>rounds played</span></div></div><div class="v4-row"><button class="btn primary" type="button" id="v4GameAgain">Play again</button></div>`; return;
  }
  newRound();
  b.innerHTML = `<p class="v4-meta">Question ${gRound + 1} of ${GAME_LEN} · score ${gScore}</p><p class="v4-game-q">“${round.html}”</p><div class="v4-opts">${round.opts.map(o => `<button type="button" data-ans="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
}
game.addEventListener('click', e => {
  const t = e.target.closest('button'); if(!t) return;
  if(t.id === 'v4GameAgain'){ gScore = 0; gRound = 0; renderGame(); return; }
  if(t.dataset.ans != null && round && !round.done){
    round.done = true; const ok = t.dataset.ans === round.ans; if(ok) gScore++;
    $$('.v4-opts button', game).forEach(x => { x.disabled = true; if(x.dataset.ans === round.ans) x.classList.add('right'); else if(x === t) x.classList.add('wrong'); });
    gRound++;
    const nb = document.createElement('button'); nb.className = 'btn primary'; nb.type = 'button'; nb.textContent = gRound >= GAME_LEN ? 'See results' : 'Next →'; nb.id = 'v4GameNext'; $('.v4-opts', game).after(nb); nb.focus();
  }
  if(t.id === 'v4GameNext') renderGame();
});

/* ============ 6. AMBIENCE MIXER + GENERATIVE RADIO + SLEEP TIMER ============ */
const amb = makeOverlay('v4Amb', 'Ambience & radio', `<p class="v4-meta">Soundscapes are generated live in your browser — no downloads, works offline.</p>
<span class="v4-label">Soundscape mixer</span><div id="v4Layers"></div>
<span class="v4-label">Generative radio</span><div class="v4-row" id="v4Moods"></div>
<span class="v4-label">Master volume</span><div class="v4-slider"><span>Volume</span><input type="range" id="v4Master" min="0" max="100" value="60"></div>
<span class="v4-label">Sleep timer</span><div class="v4-row" id="v4Sleep"></div><p class="v4-meta" id="v4SleepNote"></p>
<div class="v4-row"><button class="btn" type="button" id="v4AmbStop">■ Stop everything</button></div>`);
let actx = null, master = null, wetBus = null;
const layerNodes = {}, layerVol = {rain:0, wind:0, waves:0, fire:0, brown:0, pad:0};
const LAYER_NAMES = {rain:'🌧 Rain', wind:'🍃 Wind', waves:'🌊 Waves', fire:'🔥 Fireplace', brown:'🌫 Deep noise', pad:'🎹 Warm pad'};
function ac(){
  if(!actx){
    const C = window.AudioContext || window.webkitAudioContext; if(!C) return null;
    actx = new C(); master = actx.createGain(); master.gain.value = .6; master.connect(actx.destination);
    const conv = actx.createConvolver(), len = actx.sampleRate * 2.6, buf = actx.createBuffer(2, len, actx.sampleRate);
    for(let c = 0; c < 2; c++){ const d = buf.getChannelData(c); for(let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    conv.buffer = buf; wetBus = actx.createGain(); wetBus.gain.value = .5; wetBus.connect(conv); conv.connect(master);
  }
  if(actx.state === 'suspended') actx.resume();
  return actx;
}
function noiseBuf(kind){
  const len = actx.sampleRate * 4, b = actx.createBuffer(1, len, actx.sampleRate), d = b.getChannelData(0); let last = 0;
  for(let i = 0; i < len; i++){ const w = Math.random() * 2 - 1; if(kind === 'brown'){ last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
  return b;
}
function startLayer(k){
  if(layerNodes[k] || !ac()) return;
  const g = actx.createGain(); g.gain.value = 0; g.connect(master); const stop = [];
  const loop = (kind) => { const s = actx.createBufferSource(); s.buffer = noiseBuf(kind); s.loop = true; s.start(); stop.push(() => { try{ s.stop(); }catch{} }); return s; };
  const lfo = (freq, depth, target) => { const o = actx.createOscillator(), og = actx.createGain(); o.frequency.value = freq; og.gain.value = depth; o.connect(og); og.connect(target); o.start(); stop.push(() => { try{ o.stop(); }catch{} }); };
  if(k === 'rain'){ const s = loop('white'), hp = actx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400; const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000; s.connect(hp); hp.connect(lp); lp.connect(g); }
  else if(k === 'wind'){ const s = loop('brown'), bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = .6; const m = actx.createGain(); m.gain.value = .7; s.connect(bp); bp.connect(m); m.connect(g); lfo(.07, .5, m.gain); lfo(.13, 150, bp.frequency); }
  else if(k === 'waves'){ const s = loop('brown'), lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; const m = actx.createGain(); m.gain.value = .6; s.connect(lp); lp.connect(m); m.connect(g); lfo(.11, .5, m.gain); }
  else if(k === 'brown'){ const s = loop('brown'), lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; s.connect(lp); lp.connect(g); }
  else if(k === 'fire'){
    const s = loop('brown'), lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 350; const m = actx.createGain(); m.gain.value = .5; s.connect(lp); lp.connect(m); m.connect(g);
    const iv = setInterval(() => { if(actx.state !== 'running') return; const n = 1 + Math.floor(Math.random() * 3); for(let i = 0; i < n; i++){ const t = actx.currentTime + Math.random() * .12, b = actx.createBufferSource(); b.buffer = noiseBuf('white'); const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500 + Math.random() * 3500; const eg = actx.createGain(); eg.gain.setValueAtTime(0, t); eg.gain.linearRampToValueAtTime(.5 * Math.random(), t + .002); eg.gain.exponentialRampToValueAtTime(.001, t + .03 + Math.random() * .05); b.connect(f); f.connect(eg); eg.connect(g); b.start(t, Math.random() * 3, .1); } }, 140);
    stop.push(() => clearInterval(iv));
  }
  else if(k === 'pad'){ const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 650; lp.connect(g); [110, 164.81, 220, 277.18, 329.63].forEach((f, i) => { const o = actx.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = f; o.detune.value = (i - 2) * 6; const og = actx.createGain(); og.gain.value = .12; o.connect(og); og.connect(lp); o.start(); stop.push(() => { try{ o.stop(); }catch{} }); lfo(.05 + i * .02, 40, o.detune); }); }
  layerNodes[k] = {g, stop};
}
function setLayer(k, v){
  layerVol[k] = v;
  if(v > 0){ startLayer(k); if(layerNodes[k]) layerNodes[k].g.gain.setTargetAtTime(v / 100 * .9, actx.currentTime, .3); }
  else if(layerNodes[k]){ const n = layerNodes[k]; n.g.gain.setTargetAtTime(0, actx.currentTime, .2); delete layerNodes[k]; setTimeout(() => { n.stop.forEach(f => f()); try{ n.g.disconnect(); }catch{} }, 900); }
}
/* generative radio */
const MOODS = {
  calm:{label:'🎼 Calm piano', bpm:62, wave:'triangle', prog:[[0,4,7,11],[5,9,12,16],[3,7,10,14],[7,11,14,17]], root:55, scale:[0,2,4,7,9,12,14,16], dens:.55},
  dream:{label:'☁ Dreamy', bpm:50, wave:'sine', prog:[[0,7,12,16],[2,9,14,17],[-3,4,9,12],[-5,2,7,11]], root:65.41, scale:[0,2,7,9,12,14,19], dens:.35},
  lofi:{label:'☕ Warm lofi', bpm:74, wave:'triangle', prog:[[2,5,9,12],[7,11,14,17],[0,4,7,11],[9,12,16,19]], root:61.74, scale:[0,3,5,7,10,12,15,17], dens:.7},
  focus:{label:'🎯 Deep focus', bpm:45, wave:'sine', prog:[[0,7,12],[0,7,14],[-2,5,12],[-2,5,10]], root:49, scale:[0,7,12,14,19], dens:.22}
};
let radio = null;
const mf = (root, semis) => root * Math.pow(2, semis / 12);
function note(freq, t, dur, vol, wave, dest){
  const o = actx.createOscillator(), g = actx.createGain(); o.type = wave; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(.4, dur * .25)); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .05);
}
function startRadio(key){
  stopRadio(); if(!ac()) return;
  const m = MOODS[key], beat = 60 / m.bpm, bus = actx.createGain(); bus.gain.value = 0; bus.gain.setTargetAtTime(.75, actx.currentTime, 1.2);
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = key === 'lofi' ? 1800 : 3200; bus.connect(lp); lp.connect(master); lp.connect(wetBus);
  let nextT = actx.currentTime + .15, bar = 0;
  const sched = () => {
    while(nextT < actx.currentTime + 2.5){
      const chord = m.prog[bar % m.prog.length];
      chord.forEach((s, i) => note(mf(m.root * 2, s), nextT + i * .03, beat * 4.1, .09, m.wave === 'sine' ? 'sine' : 'triangle', bus));
      note(mf(m.root, chord[0]), nextT, beat * 4, .16, 'sine', bus);
      for(let b = 0; b < 8; b++){ if(Math.random() < m.dens){ const s = m.scale[Math.floor(Math.random() * m.scale.length)] + chord[0]; note(mf(m.root * 4, s), nextT + b * beat * .5 + (key === 'lofi' && b % 2 ? beat * .08 : 0), beat * 1.6, .07 + Math.random() * .04, m.wave, bus); } }
      nextT += beat * 4; bar++;
    }
  };
  sched(); const iv = setInterval(sched, 600);
  radio = {key, bus, iv};
}
function stopRadio(){
  if(!radio) return; clearInterval(radio.iv); const r = radio; radio = null;
  try{ r.bus.gain.setTargetAtTime(0, actx.currentTime, .3); }catch{}
  setTimeout(() => { try{ r.bus.disconnect(); }catch{} }, 1500);
}
function stopAmbience(){ Object.keys(layerVol).forEach(k => { layerVol[k] = 0; setLayer(k, 0); }); stopRadio(); clearSleep(); renderAmb(); }
let sleepTimer = 0, sleepEnd = 0, sleepTick = 0;
function clearSleep(){ clearTimeout(sleepTimer); clearInterval(sleepTick); sleepEnd = 0; const n = $('#v4SleepNote'); if(n) n.textContent = ''; }
function setSleep(min){
  clearSleep(); if(!min){ renderAmb(); return; }
  sleepEnd = Date.now() + min * 60000;
  sleepTimer = setTimeout(() => {
    if(master && actx){ master.gain.setTargetAtTime(0, actx.currentTime, 4); }
    try{ if(typeof musicAudio !== 'undefined' && musicAudio && !musicAudio.paused) musicAudio.pause(); }catch{}
    setTimeout(() => { stopAmbience(); if(master) master.gain.value = (+$('#v4Master').value) / 100; showToast('🌙', 'Good night', 'Sleep timer finished — sound faded out.'); }, 8000);
  }, min * 60000);
  sleepTick = setInterval(() => { const n = $('#v4SleepNote'); if(n){ const left = Math.max(0, Math.round((sleepEnd - Date.now()) / 60000)); n.textContent = `Sound will fade out in about ${left} min (music player pauses too).`; } }, 5000);
  const n = $('#v4SleepNote'); if(n) n.textContent = `Sound will fade out in about ${min} min (music player pauses too).`;
  renderAmb();
}
function renderAmb(){
  $('#v4Layers').innerHTML = Object.keys(LAYER_NAMES).map(k => `<div class="v4-slider"><span>${LAYER_NAMES[k]}</span><input type="range" min="0" max="100" value="${layerVol[k]}" data-layer="${k}" aria-label="${LAYER_NAMES[k]} volume"></div>`).join('');
  $('#v4Moods').innerHTML = Object.keys(MOODS).map(k => `<button class="v4-chip" type="button" data-mood="${k}" aria-pressed="${!!(radio && radio.key === k)}">${MOODS[k].label}</button>`).join('');
  $('#v4Sleep').innerHTML = [[0,'Off'],[15,'15 min'],[30,'30 min'],[45,'45 min'],[60,'1 hour'],[90,'90 min']].map(o => `<button class="v4-chip" type="button" data-sleep="${o[0]}" aria-pressed="${o[0] ? (sleepEnd > 0 && Math.abs((sleepEnd - Date.now()) / 60000 - o[0]) < 1.2) : !sleepEnd}">${o[1]}</button>`).join('');
}
amb.addEventListener('input', e => {
  if(e.target.dataset.layer) setLayer(e.target.dataset.layer, +e.target.value);
  if(e.target.id === 'v4Master' && master) master.gain.setTargetAtTime(+e.target.value / 100, actx.currentTime, .1);
});
amb.addEventListener('click', e => {
  const t = e.target.closest('button'); if(!t) return;
  if(t.dataset.mood){ if(radio && radio.key === t.dataset.mood) stopRadio(); else startRadio(t.dataset.mood); renderAmb(); }
  if(t.dataset.sleep != null) setSleep(+t.dataset.sleep);
  if(t.id === 'v4AmbStop') stopAmbience();
});

/* more tracks from music/tracks.json (optional file you can add yourself) */
fetch('music/tracks.json', {cache:'no-cache'}).then(r => r.ok ? r.json() : []).then(list => {
  if(!Array.isArray(list) || typeof MUSIC_TRACKS === 'undefined') return;
  let added = 0;
  list.forEach(t => { if(t && typeof t.file === 'string' && typeof t.title === 'string' && /^music\/[\w .()\-]+\.(mp3|m4a|ogg|wav)$/i.test(t.file) && !MUSIC_TRACKS.some(x => x.file === t.file)){ MUSIC_TRACKS.push({file:t.file, title:t.title.slice(0, 80)}); added++; } });
  if(added && typeof buildMusicList === 'function') buildMusicList();
}).catch(() => {});

/* ============ 7. SHORTCUTS + COMMAND PALETTE ============ */
const help = makeOverlay('v4Help', 'Keyboard shortcuts', `<div class="v4-kbd">
<kbd>Ctrl/⌘ K</kbd><span>Command menu — search quotes &amp; run any action</span><kbd>?</kbd><span>This help</span><kbd>/</kbd><span>Focus the search box</span><kbd>R</kbd><span>Random quote</span><kbd>Space / → / ←</kbd><span>Next / previous card in Focus Mode</span><kbd>Esc</kbd><span>Close any panel</span></div>`);
const pal = makeOverlay('v4Pal', 'Command menu', `<input class="v4-pal-in" id="v4PalIn" placeholder="Type a command or search quotes…" autocomplete="off" aria-label="Command menu search"><ul class="v4-pal-list" id="v4PalList" role="listbox"></ul>`);
$('.v4-panel', pal).querySelector('.v4-head').style.display = 'none';
const click = id => () => { const b = $(id); if(b) b.click(); };
const goTo = id => () => { const el = $(id); if(el) el.scrollIntoView({behavior:ui.calm ? 'auto' : 'smooth'}); };
const randomQuote = () => quotes[Math.floor(Math.random() * quotes.length)];
const ACTIONS = [
  ['Random quote', 'R', () => openQuoteDetail(randomQuote())],
  ['Make a post image from today’s quote', '', () => { try{ openPostStudio(getQOTD()); }catch{} }],
  ['Make a post image from a random quote', '', () => openPostStudio(randomQuote())],
  ['Focus mode', '', click('#focusBtn')],
  ['Toggle day / night theme', '', click('#themeBtn')],
  ['Toggle sound effects', '', click('#soundBtn')],
  ['Open reading calendar', '', click('#calendarBtn')],
  ['Open achievements', '', click('#achieveBtn')],
  ['Open music player', '', click('#musicFab')],
  ['Ambience, soundscapes & radio', '', () => { renderAmb(); openOverlay(amb); }],
  ['Missing-word game', '', () => { gScore = 0; gRound = 0; renderGame(); openOverlay(game); }],
  ['My Space — collections, notes, my quotes, backup', '', () => { renderSpace(); openOverlay(space); }],
  ['Your insights', '', () => { renderInsights(); openOverlay(insights); }],
  ['Appearance & accessibility', '', () => { renderAppearance(); openOverlay(appearance); }],
  ['Keyboard shortcuts', '?', () => openOverlay(help)],
  ['Go to the generator', '', goTo('#generator')],
  ['Go to favourites', '', goTo('#favorites')],
  ['Go to the drawers', '', goTo('#drawers')]
];
try{ CATS.forEach(c => ACTIONS.push([`Open drawer: ${c.label}`, c.icon, () => { setCategory(c.key); goTo('#drawers')(); }])); }catch{}
let palSel = 0, palItems = [];
function renderPal(){
  const qv = $('#v4PalIn').value.trim().toLowerCase();
  const acts = ACTIONS.filter(a => !qv || a[0].toLowerCase().includes(qv)).slice(0, qv ? 8 : 14).map(a => ({t:a[0], h:a[1], run:a[2]}));
  let hits = [];
  if(qv.length >= 2){ const all = quotes.concat(mine); hits = all.filter(q => q.quote.toLowerCase().includes(qv)).slice(0, 8).map(q => ({t:snip(q.quote, 80), h:q.catNo, run:() => openQuoteDetail(q)})); }
  palItems = acts.concat(hits); palSel = 0;
  $('#v4PalList').innerHTML = palItems.map((it, i) => `<li role="option" data-i="${i}" aria-selected="${i === 0}"><span class="t">${esc(it.t)}</span><small>${esc(it.h || '')}</small></li>`).join('') || '<li><span class="t">No matches</span></li>';
}
function palMove(d){ if(!palItems.length) return; palSel = (palSel + d + palItems.length) % palItems.length; $$('#v4PalList li').forEach((li, i) => { li.setAttribute('aria-selected', String(i === palSel)); if(i === palSel) li.scrollIntoView({block:'nearest'}); }); }
function palRun(i){ const it = palItems[i]; if(!it) return; closeOverlay(pal); setTimeout(() => it.run(), 50); }
function openPalette(){ $('#v4PalIn').value = ''; renderPal(); openOverlay(pal); }
$('#v4PalIn').addEventListener('input', renderPal);
$('#v4PalIn').addEventListener('keydown', e => { if(e.key === 'ArrowDown'){ e.preventDefault(); palMove(1); } else if(e.key === 'ArrowUp'){ e.preventDefault(); palMove(-1); } else if(e.key === 'Enter'){ e.preventDefault(); palRun(palSel); } });
$('#v4PalList').addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if(li) palRun(+li.dataset.i); });
document.addEventListener('keydown', e => {
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); pal.classList.contains('open') ? closeOverlay(pal) : openPalette(); return; }
  const tag = (e.target.tagName || '').toLowerCase();
  if(e.key === '?' && !['input', 'textarea', 'select'].includes(tag) && !e.ctrlKey && !e.metaKey){ e.preventDefault(); openOverlay(help); }
});

/* ============ 8. NAV BUTTON, FAB, PROGRESS BAR, BACK-TO-TOP ============ */
const navLinks = $('.nav-links');
if(navLinks){
  const b = document.createElement('button'); b.className = 'icon-btn'; b.type = 'button'; b.id = 'v4MenuBtn'; b.title = 'Command menu (Ctrl/⌘ K)'; b.innerHTML = '✦ <span class="v4-nav-label">Menu</span>'; b.addEventListener('click', openPalette);
  navLinks.insertBefore(b, navLinks.firstChild);
}
const fab = document.createElement('button'); fab.className = 'v4-fab'; fab.type = 'button'; fab.setAttribute('aria-label', 'Open ambience and radio'); fab.title = 'Ambience & radio'; fab.textContent = '🎧';
fab.addEventListener('click', () => { renderAmb(); openOverlay(amb); }); document.body.appendChild(fab);
const bar = document.createElement('div'); bar.className = 'v4-progress'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);
const topBtn = document.createElement('button'); topBtn.className = 'v4-top'; topBtn.type = 'button'; topBtn.setAttribute('aria-label', 'Back to top'); topBtn.textContent = '↑'; topBtn.addEventListener('click', () => window.scrollTo({top:0, behavior:ui.calm ? 'auto' : 'smooth'})); document.body.appendChild(topBtn);
let tick = false;
window.addEventListener('scroll', () => { if(tick) return; tick = true; requestAnimationFrame(() => { const h = document.documentElement.scrollHeight - innerHeight; bar.style.width = (h > 0 ? scrollY / h * 100 : 0) + '%'; topBtn.classList.toggle('show', scrollY > 900); tick = false; }); }, {passive:true});

applyUI();
window.QuoteArchiveV4 = {audioState:() => actx ? actx.state : 'none', openMenu:openPalette};
})();
