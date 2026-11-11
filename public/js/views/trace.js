import { api } from '../api.js';
import { icon, orb, esc, toast, popover, closePopovers, sleep } from '../ui.js';
import { state, go } from '../app.js';

// Knowledge trace (Figma 02. Research, flow 6 → LC / Research / Knowledge Trace).
// States: Loading (Bridge builds the map) → Ready (the network) → Node selected (path lit, details panel).
// Node positions and the 71 connections are read from the Figma "Ready" frame (stage 1096 × 792).

const STAGE = { w: 1096, h: 792 };
const RANK = { question: 0, answer: 1, finding: 2, source: 3, passage: 4, entity: 4 };
const SHAPE = { passage: 20, entity: 32, source: 40, finding: 48 };
const GLYPH = { passage: 'format_quote', entity: 'account_balance', source: 'description', finding: 'lightbulb_outline', answer: 'forum', question: 'live_help' };
const TYPE_LABEL = { passage: 'Passage', entity: 'Ministry or body', source: 'Source · paper', finding: 'Finding', answer: 'Answer', question: 'Question' };
const STEPS = (g) => [`Reading ${count(g, 'question')} questions and ${count(g, 'answer')} answers`, `Matching ${count(g, 'source')} sources and ${count(g, 'passage')} passages`, 'Linking findings to each answer', 'Laying out the graph'];
const count = (g, t) => g.nodes.filter((n) => n.type === t).length;
const SHIFT_FOR_PANEL = 200; // Figma "Node selected": the map moves 200 left to make room for the panel

// Builds are remembered per thread for this session; a build keeps running if you go back to the chat.
const built = (id) => sessionStorage.getItem('bridge-trace:' + id) === 'ready';
const building = {};

let ui = { sel: null, answer: 'all', show: 'all', scale: 1, panX: 0, panY: 0 };
let lastId = null;

function center(n) {
  const h = n.h || SHAPE[n.type];
  return { x: n.x + n.w / 2, y: n.y + h / 2 };
}

function graphIndex(g) {
  const byId = Object.fromEntries(g.nodes.map((n) => [n.id, n]));
  const adj = {};
  g.edges.forEach(([a, b]) => { (adj[a] ||= new Set()).add(b); (adj[b] ||= new Set()).add(a); });
  // Walk one way only (up to questions, or down to passages and bodies) so unrelated items stay faded.
  const walk = (start, dir) => {
    const seen = new Set([start]); const q = [start];
    while (q.length) {
      const id = q.shift();
      for (const nb of adj[id] || []) {
        if (seen.has(nb)) continue;
        const d = RANK[byId[nb].type] - RANK[byId[id].type];
        if ((dir === 'up' && d < 0) || (dir === 'down' && d > 0)) { seen.add(nb); q.push(nb); }
      }
    }
    return seen;
  };
  const path = (id) => new Set([...walk(id, 'up'), ...walk(id, 'down')]);
  const near = (id, type) => [...(adj[id] || [])].map((x) => byId[x]).filter((n) => n.type === type);
  return { byId, adj, walk, path, near };
}

export async function render({ id }) {
  if (lastId !== id) { ui = { sel: null, answer: 'all', show: 'all', scale: 1, panX: 0, panY: 0 }; lastId = id; }
  const t = await api.get('threads', id);
  const g = (await api.list('traces', { threadId: id }))[0] || (await api.get('traces', 'tr-land'));
  const name = t?.name || t?.question || g.name;
  const ready = built(id);
  if (!ready && !building[id]) startBuild(id, name);
  return {
    title: 'Knowledge trace',
    html: `<div class="kt" data-state="${ready ? 'ready' : 'loading'}">
      <header class="kt-head">
        <button class="icon-btn" id="ktBack" aria-label="Back to the conversation">${icon('back')}</button>
        <nav class="breadcrumb" aria-label="Path"><a href="#/research">Research</a>${icon('right', 's16')}<a href="#/research/thread/${esc(id)}">${esc(name)}</a>${icon('right', 's16')}<span class="current">Knowledge trace</span></nav>
        <span class="spacer"></span>
        <button class="btn tertiary sm" id="ktExport" ${ready ? '' : 'disabled'}>Export</button>
        <button class="btn secondary sm" id="ktShare" ${ready ? '' : 'disabled'}>Share</button>
      </header>
      <div class="kt-title"><h3>Knowledge trace</h3>
        <p>What Bridge used to answer “${esc(name)}”: ${count(g, 'question')} questions, ${count(g, 'answer')} answers, ${count(g, 'finding')} findings, ${count(g, 'source')} sources. Bigger items carried more weight.</p></div>
      <div class="kt-toolbar">
        <button class="filter-pill" id="ktShow" ${ready ? '' : 'disabled'}><span class="l">Show</span><b>${ui.show === 'all' ? 'Everything' : 'Without passages'}</b>${icon('down', 's16')}</button>
        <button class="filter-pill" id="ktAnswer" ${ready ? '' : 'disabled'}><span class="l">Answer</span><b>${ui.answer === 'all' ? 'All answers' : 'Answer ' + g.nodes.find((n) => n.id === ui.answer).n}</b>${icon('down', 's16')}</button>
        <span class="spacer"></span>
        <div class="kt-legend">${[['question', 'Question'], ['answer', 'Answer'], ['finding', 'Finding'], ['source', 'Source'], ['passage', 'Passage'], ['entity', 'Ministry or body']].map(([k, l]) => `<span><i class="sw" data-k="${k}"></i>${l}</span>`).join('')}</div>
        <span class="kt-divider" aria-hidden="true"></span>
        <span class="kt-meta" id="ktMeta">${ready ? `${g.nodes.length} items · built ${esc(g.built)}` : `Building… ${building[id]?.pct || 0}%`}</span>
      </div>
      <div class="kt-canvas" id="ktCanvas">
        <div class="kt-stage" id="ktStage" style="width:${STAGE.w}px;height:${STAGE.h}px">${stage(g, ready)}</div>
        ${ready ? `<div class="kt-zoom" role="group" aria-label="Zoom"><button class="icon-btn" data-zoom="in" aria-label="Zoom in">${icon('zoomIn')}</button><button class="icon-btn" data-zoom="out" aria-label="Zoom out">${icon('zoomOut')}</button><button class="icon-btn" data-zoom="fit" aria-label="Fit to screen">${icon('zoom_out_map')}</button></div>` : statusCard(g, id)}
        ${ready && ui.sel ? details(g, ui.sel) : ''}
      </div>
    </div>`,
    mount(root) { mount(root, id, g, name, ready, t); },
  };
}

function stage(g, ready) {
  const ix = graphIndex(g);
  const vis = visibleSet(g, ix);
  const lit = ui.sel ? ix.path(ui.sel) : null;
  const shown = (n) => ready ? vis.has(n.id) : (n.type === 'question' || n.type === 'answer');
  const weight = (a, b) => { const r = [RANK[ix.byId[a].type], RANK[ix.byId[b].type]].sort(); return r[1] <= 1 || (r[0] === 1 && r[1] === 2) ? 2 : r[0] === 2 && r[1] === 3 ? 1.5 : 1; };
  const edges = g.edges.filter(([a, b]) => shown(ix.byId[a]) && shown(ix.byId[b])).map(([a, b]) => {
    const p = center(ix.byId[a]); const q = center(ix.byId[b]);
    const on = lit && lit.has(a) && lit.has(b);
    const cls = !ready ? 'ghost' : lit ? (on ? 'lit' : 'dim') : '';
    return `<line class="${cls}" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke-width="${weight(a, b) + (on ? 0.5 : 0)}"/>`;
  }).join('');
  const nodes = g.nodes.filter(shown).map((n) => {
    const c = center(n);
    const cls = !ready ? 'ghost' : lit ? (lit.has(n.id) ? '' : 'dim') : '';
    const label = n.type === 'passage' ? `${TYPE_LABEL.passage}, ${n.page}: ${n.quote}` : `${TYPE_LABEL[n.type]}: ${n.label}`;
    if (n.type === 'question' || n.type === 'answer') {
      return `<button class="kt-node kt-${n.type} ${cls} ${ui.sel === n.id ? 'sel' : ''}" data-node="${n.id}" style="left:${c.x}px;top:${c.y}px;width:${n.w}px" aria-label="${esc(label)}" ${ready ? '' : 'tabindex="-1"'}>
        <span class="shape">${icon(GLYPH[n.type])}<span>${esc(n.label)}</span></span></button>`;
    }
    return `<button class="kt-node kt-${n.type} ${cls} ${ui.sel === n.id ? 'sel' : ''}" data-node="${n.id}" style="left:${c.x}px;top:${c.y}px;--sh:${SHAPE[n.type]}px" aria-label="${esc(label)}">
      <span class="shape">${icon(GLYPH[n.type])}</span>${n.type === 'passage' ? '' : `<span class="lbl">${esc(n.label)}</span>`}</button>`;
  }).join('');
  return `<svg class="kt-edges" viewBox="0 0 ${STAGE.w} ${STAGE.h}" width="${STAGE.w}" height="${STAGE.h}" aria-hidden="true">${edges}</svg>${nodes}`;
}

function visibleSet(g, ix) {
  let ids = new Set(g.nodes.map((n) => n.id));
  if (ui.answer !== 'all') {
    const a = ui.answer;
    ids = new Set([...ix.walk(a, 'up'), ...ix.walk(a, 'down')]);
  }
  if (ui.show === 'nopassages') g.nodes.forEach((n) => n.type === 'passage' && ids.delete(n.id));
  return ids;
}

function statusCard(g, id) {
  const b = building[id] || { step: 0, pct: 0 };
  return `<div class="kt-status" role="status" aria-live="polite">
    <div class="bridge-line">${orb('sm', state.user.agentLook, 'thinking')}<span>Building the knowledge trace</span><span class="time">Started ${esc(g.started)}</span></div>
    <div class="onb-processing kt-proc"><span class="ind">${icon('cached')}</span><ol>${STEPS(g).map((s, i) => `<li class="${i < b.step ? 'done' : ''}"><span class="tick">${i < b.step ? '✓' : ''}</span>${esc(s)}</li>`).join('')}</ol></div>
    <div class="kt-progress"><div class="progress"><span style="width:${b.pct}%"></span></div><b>${b.pct}%</b></div>
    <p>Usually under a minute. You can go back to the chat; ${esc(state.user.agentName)} will let you know when the trace is ready.</p></div>`;
}

// Scripted build: four steps over ~5 seconds. Runs on even if you leave the page.
async function startBuild(id, name) {
  const b = (building[id] = { step: 0, pct: 0 });
  const tick = () => {
    if (location.hash !== `#/research/thread/${id}/trace`) return;
    const card = document.querySelector('.kt-status');
    if (!card) return;
    card.querySelectorAll('li').forEach((li, i) => { li.classList.toggle('done', i < b.step); li.querySelector('.tick').textContent = i < b.step ? '✓' : ''; });
    card.querySelector('.progress span').style.width = b.pct + '%';
    card.querySelector('.kt-progress b').textContent = b.pct + '%';
    const m = document.getElementById('ktMeta'); if (m) m.textContent = `Building… ${b.pct}%`;
  };
  for (let s = 1; s <= 4; s++) { await sleep(1200); b.step = s; b.pct = s * 25; tick(); }
  await sleep(500);
  sessionStorage.setItem('bridge-trace:' + id, 'ready');
  delete building[id];
  if (location.hash === `#/research/thread/${id}/trace`) { const { render: rr } = await import('../app.js'); rr(); }
  else toast(`Knowledge trace ready: ${name}`, 'Open', () => go(`#/research/thread/${id}/trace`));
}

function details(g, id) {
  const ix = graphIndex(g); const n = ix.byId[id];
  const up = ix.walk(id, 'up');
  const answers = g.nodes.filter((x) => x.type === 'answer' && up.has(x.id));
  const sec = (h, items) => items.length ? `<section><h6>${esc(h)}</h6>${items.join('')}</section>` : '';
  const item = (text, detail) => `<div class="kt-item"><p>${esc(text)}</p>${detail ? `<span>${esc(detail)}</span>` : ''}</div>`;
  const usedIn = sec(`Used in ${answers.length} answer${answers.length === 1 ? '' : 's'}`, answers.map((a) => item(a.label, (n.uses && n.uses[a.id]) || `Answer ${a.n}`)));
  let type = TYPE_LABEL[n.type], title = n.label, meta = '', body = '', actions = '';
  if (n.type === 'source') {
    const passages = ix.near(id, 'passage').filter((p) => p.key);
    const findings = ix.near(id, 'finding');
    title = n.title; meta = n.meta;
    body = usedIn + sec('Passages Bridge relied on', passages.map((p) => item(`“${p.quote}”`, p.page))) + sec(findings.length === 1 ? 'Finding it supports' : 'Findings it supports', findings.map((f) => item(f.label)));
    actions = `<button class="btn secondary sm" data-act="open">Open paper</button><button class="btn tertiary sm" data-act="ask" data-q="What does “${esc(n.title)}” say about the land registry?">Ask about this source</button>`;
  } else if (n.type === 'passage') {
    const src = ix.byId[n.source];
    type = `Passage · ${n.page}`; title = `“${n.quote}”`; meta = `From ${src.title}`;
    const findings = g.nodes.filter((x) => x.type === 'finding' && up.has(x.id));
    body = sec(findings.length === 1 ? 'Finding it supports' : 'Findings it supports', findings.map((f) => item(f.label))) + usedIn;
    actions = `<button class="btn secondary sm" data-act="open">Open at ${esc(n.page)}</button><button class="btn tertiary sm" data-act="ask" data-q="Explain this passage: “${esc(n.quote)}”">Ask about this passage</button>`;
  } else if (n.type === 'finding') {
    const srcs = ix.near(id, 'source');
    meta = `Backed by ${srcs.length} source${srcs.length === 1 ? '' : 's'}`;
    body = usedIn + sec('Sources it relies on', srcs.map((s) => item(s.title, s.meta.split(' · ').slice(0, 2).join(' · '))));
    actions = `<button class="btn tertiary sm" data-act="ask" data-q="How sure are we that ${esc(n.label.charAt(0).toLowerCase() + n.label.slice(1))}?">Ask a follow-up</button>`;
  } else if (n.type === 'answer') {
    const q = ix.near(id, 'question')[0]; const fs = ix.near(id, 'finding');
    type = `Answer ${n.n}`; meta = `${n.time} · ${fs.length} findings`;
    body = sec('Answers the question', q ? [item(q.label, `Asked ${q.time}`)] : []) + sec('Findings it relies on', fs.map((f) => item(f.label)));
    actions = `<button class="btn secondary sm" data-act="chat">Go to answer</button>`;
  } else if (n.type === 'question') {
    const as = ix.near(id, 'answer');
    meta = `Asked ${n.time}`;
    body = sec('Answered by', as.map((a) => item(a.label, `Answer ${a.n} · ${a.time}`)));
    actions = `<button class="btn secondary sm" data-act="chat">Go to question</button>`;
  } else if (n.type === 'entity') {
    const srcs = ix.near(id, 'source');
    meta = `${srcs.length} source${srcs.length === 1 ? '' : 's'} in this trace`;
    body = sec('Papers from this body', srcs.map((s) => item(s.title, s.meta.split(' · ').slice(0, 2).join(' · ')))) + usedIn;
    actions = `<button class="btn tertiary sm" data-act="dir">Open in Directory</button>`;
  }
  return `<aside class="kt-panel" aria-label="Details: ${esc(title)}">
    <div class="kt-panel-top"><span>${esc(type)}</span><button class="icon-btn" data-act="close" aria-label="Close details">${icon('close')}</button></div>
    <div class="kt-panel-title"><h5>${esc(title)}</h5>${meta ? `<span>${esc(meta)}</span>` : ''}</div>
    ${body}<div class="kt-actions">${actions}</div></aside>`;
}

function mount(root, id, g, name, ready, t) {
  const back = () => go('#/research/thread/' + id);
  root.querySelector('#ktBack').onclick = back;
  if (!ready) return;
  const canvas = root.querySelector('#ktCanvas');
  const st = root.querySelector('#ktStage');
  const apply = (animate) => {
    st.style.transition = animate ? 'transform .25s ease' : 'none';
    const shift = ui.sel ? SHIFT_FOR_PANEL * ui.scale : 0;
    st.style.transform = `translate(${ui.panX - shift}px, ${ui.panY}px) scale(${ui.scale})`;
  };
  const fit = () => {
    const s = Math.min(canvas.clientWidth / STAGE.w, canvas.clientHeight / STAGE.h, 1);
    ui.scale = s; ui.panX = (canvas.clientWidth - STAGE.w * s) / 2; ui.panY = (canvas.clientHeight - STAGE.h * s) / 2;
  };
  if (!ui.fitted) { fit(); ui.fitted = true; }
  apply(false);
  const redraw = () => {
    st.innerHTML = stage(g, true);
    canvas.querySelector('.kt-panel')?.remove();
    if (ui.sel) { canvas.insertAdjacentHTML('beforeend', details(g, ui.sel)); bindPanel(); }
    apply(true);
  };
  const zoom = (f) => {
    const cx = canvas.clientWidth / 2, cy = canvas.clientHeight / 2;
    const ns = Math.max(0.4, Math.min(2.5, ui.scale * f));
    ui.panX = cx - ((cx - ui.panX) * ns) / ui.scale; ui.panY = cy - ((cy - ui.panY) * ns) / ui.scale; ui.scale = ns; apply(true);
  };
  root.querySelectorAll('[data-zoom]').forEach((b) => (b.onclick = () => { if (b.dataset.zoom === 'fit') { fit(); apply(true); } else zoom(b.dataset.zoom === 'in' ? 1.2 : 1 / 1.2); }));
  canvas.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); zoom(e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });

  // Drag the empty canvas to pan; click a node to follow its path; click empty space to clear.
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.kt-node, .kt-panel, .kt-zoom')) return;
    drag = { x: e.clientX, y: e.clientY, px: ui.panX, py: ui.panY, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    ui.panX = drag.px + dx; ui.panY = drag.py + dy; apply(false); canvas.classList.toggle('panning', drag.moved);
  });
  canvas.addEventListener('pointerup', () => { if (drag && !drag.moved && ui.sel) { ui.sel = null; redraw(); } drag = null; canvas.classList.remove('panning'); });
  st.addEventListener('click', (e) => { const b = e.target.closest('[data-node]'); if (!b) return; ui.sel = ui.sel === b.dataset.node ? null : b.dataset.node; redraw(); });
  const onKey = (e) => { if (e.key === 'Escape' && ui.sel && !document.querySelector('.popover')) { ui.sel = null; redraw(); } };
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', () => document.removeEventListener('keydown', onKey), { once: true });

  function bindPanel() {
    const p = canvas.querySelector('.kt-panel'); if (!p) return;
    p.onclick = (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const a = b.dataset.act;
      if (a === 'close') { ui.sel = null; redraw(); }
      if (a === 'open') toast('Opening the paper at the quoted page (prototype)');
      if (a === 'dir') go('#/directory/ministry');
      if (a === 'chat') back();
      if (a === 'ask') { sessionStorage.setItem('bridge-followup', b.dataset.q); back(); }
    };
  }
  bindPanel();

  root.querySelector('#ktExport').onclick = (e) => {
    const pop = popover(e.currentTarget, `<button class="menu-item" data-f="PNG">${icon('download', 's16')}Image (PNG)</button><button class="menu-item" data-f="PDF">${icon('download', 's16')}PDF with passages</button>`, { align: 'right' });
    pop.onclick = (ev) => { const f = ev.target.closest('[data-f]')?.dataset.f; if (f) { closePopovers(); toast(`Knowledge trace exported as ${f} (prototype)`); } };
  };
  root.querySelector('#ktShare').onclick = () => toast('Link copied. People you share with see this trace as of ' + g.built + ' (prototype)');
  root.querySelector('#ktShow').onclick = (e) => {
    const btn = e.currentTarget;
    const pop = popover(e.currentTarget, [['all', 'Everything'], ['nopassages', 'Without passages']].map(([k, l]) => `<button class="menu-item ${ui.show === k ? 'active' : ''}" data-v="${k}">${l}</button>`).join(''));
    pop.onclick = (ev) => { const v = ev.target.closest('[data-v]')?.dataset.v; if (!v) return; closePopovers(); ui.show = v; if (ui.sel && v === 'nopassages' && g.nodes.find((n) => n.id === ui.sel).type === 'passage') ui.sel = null; btn.querySelector('b').textContent = v === 'all' ? 'Everything' : 'Without passages'; redraw(); };
  };
  root.querySelector('#ktAnswer').onclick = (e) => {
    const btn = e.currentTarget;
    const as = g.nodes.filter((n) => n.type === 'answer');
    const pop = popover(e.currentTarget, `<button class="menu-item ${ui.answer === 'all' ? 'active' : ''}" data-v="all">All answers</button>${as.map((a) => `<button class="menu-item ${ui.answer === a.id ? 'active' : ''}" data-v="${a.id}">Answer ${a.n} · ${esc(a.label)}</button>`).join('')}`);
    pop.onclick = (ev) => { const v = ev.target.closest('[data-v]')?.dataset.v; if (!v) return; closePopovers(); ui.answer = v; ui.sel = null; btn.querySelector('b').textContent = v === 'all' ? 'All answers' : 'Answer ' + as.find((a) => a.id === v).n; redraw(); };
  };
}
