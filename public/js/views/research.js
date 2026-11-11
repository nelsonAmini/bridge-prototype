import { api } from '../api.js';
import { icon, orb, esc, modal, sleep, toast, popover, closePopovers } from '../ui.js';
import { state, go, render as rerender } from '../app.js';

// Ask bar = Amini Kit "AI Chatbox" (Config=Default)
export const askbar = (placeholder = 'Ask Bridge anything', value = '') => `<form class="askbar" id="ask">
  <textarea id="q" rows="1" placeholder="${placeholder}" aria-label="${placeholder}">${esc(value)}</textarea>
  <div class="tools"><span class="tool switch-tool"><button type="button" class="switch" role="switch" aria-checked="false" aria-label="Web search"></button>Web search</span>
    <button type="button" class="tool chipb">${icon('tune', 's16')}Tools</button><span class="spacer"></span>
    <button type="button" class="tool chipb">${icon('add', 's16')}Add attachment</button>
    <span class="vs"><button type="button" class="voice" aria-label="Dictate">${icon('mic', 's16')}</button><button class="send" aria-label="Send">${icon('send', 's16')}</button></span></div></form>`;

function bindAsk(root) {
  root.querySelectorAll('.askbar .switch').forEach((s) => (s.onclick = () => s.setAttribute('aria-checked', s.getAttribute('aria-checked') !== 'true')));
  const q = root.querySelector('#q');
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); root.querySelector('#ask').requestSubmit(); } });
  root.querySelector('#ask').onsubmit = async (e) => {
    e.preventDefault();
    const text = q.value.trim();
    if (!text) return q.focus();
    const tpl = await api.get('threads', 'th-land');
    const { _id, createdAt, updatedAt, ...rest } = tpl;
    const t = await api.create('threads', { ...rest, question: text, stage: 'plan', time: 'Today, ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) });
    go('#/research/thread/' + t._id);
  };
}

const trend = (s) => s.trend ? `<span class="trend ${s.tone === 'bad' ? 'down' : ''}">${icon(s.tone === 'bad' ? 'trendDown' : 'trendUp', 's16')}${esc(s.trend)}</span>` : '';
const statCard = (s) => `<div class="stat"><div class="k">${esc(s.label)}</div><div class="vv"><div class="v ${s.tone === 'bad' ? 'bad' : 'good'}">${esc(s.value)}${trend(s)}</div><div class="n">${esc(s.delta ?? s.note ?? '')}</div></div></div>`;
const actions = `<div class="answer-actions"><button type="button" data-act="copy">${icon('copy', 's16')}Copy</button><button type="button" data-act="export">${icon('export', 's16')}Export</button><button type="button" data-act="save">${icon('bookmark', 's16')}Save to My Reviews</button><button type="button" data-act="regen">${icon('regenerate', 's16')}Regenerate</button><span class="spacer"></span><button type="button" data-act="trace">${icon('trace', 's16')}Knowledge trace</button></div>`;
function bindActions(root, threadId) {
  root.querySelectorAll('.answer-actions [data-act]').forEach((b) => (b.onclick = () => b.dataset.act === 'trace' && threadId ? go(`#/research/thread/${threadId}/trace`) : toast({ copy: 'Copied to clipboard', export: 'Exported as PDF (prototype)', save: 'Saved to My Reviews', regen: 'Regenerating… (prototype)', trace: 'Knowledge trace opens the sources graph (prototype)' }[b.dataset.act])));
  root.querySelectorAll('[data-follow]').forEach((b) => (b.onclick = () => { const q = root.querySelector('#q'); q.value = b.dataset.follow; q.focus(); }));
}
const followups = (list) => `<div class="stack" style="--gap:8px"><h5>What would you like to know next?</h5><div class="follow-chips">${list.map((f) => `<button class="prompt-chip" data-follow="${esc(f)}"><span class="plus">+</span>${esc(f)}</button>`).join('')}</div></div>`;
const citations = (list, intro = '') => `<div class="stack cites-block" style="--gap:8px"><h4>Citations</h4>${intro ? `<p class="hint">${intro}</p>` : ''}<div class="cites">${list.map((s, i) => `<div><span>[${i + 1}]</span>${esc(s)}</div>`).join('')}</div></div>`;

export async function render(params, { route }) {
  if (route.pattern === 'research/brief') return brief();
  if (route.pattern === 'research/thread/:id') return thread(params.id);

  const u = state.user;
  const revs = await api.list('reviews');
  const toSign = revs.filter((r) => r.status === 'To sign').length;
  const cards = {
    briefing: `<button class="card" data-go="#/research/brief"><span class="icon-tile">${icon('sun')}</span><div class="grow txt"><b>Today’s briefing</b><div class="small muted">${toSign} to sign · 1 flagged · 3 min to listen</div></div>${icon('right')}</button>`,
    reviews: `<button class="card" data-go="#/reviews/tag/To%20sign"><span class="icon-tile">${icon('doc')}</span><div class="grow txt"><b>Papers to sign</b><div class="small muted">Live count from My Reviews: ${toSign}</div></div>${icon('right')}</button>`,
    skill: `<button class="card" data-go="#/skills"><span class="icon-tile">${icon('sparkle')}</span><div class="grow txt"><b>Friday deferred papers</b><div class="small muted">Latest result from a skill</div></div>${icon('right')}</button>`,
  };
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return {
    title: 'Research',
    html: `<div class="research-home">
      <div class="greeting">${orb('lg', u.agentLook)}
      <h1>${greet}, ${esc(u.name)}</h1>
      <p class="greet-sub">${toSign} papers need your signature today.</p></div>
      ${askbar('Ask Bridge anything', sessionStorage.getItem('bridge-ask') || '')}
      <div class="suggestions">${['Papers to sign', 'Check a paper', 'Dictate a letter'].map((s) => `<button class="prompt-chip" data-suggest="${s}">${icon('add', 's16')}${s}</button>`).join('')}</div>
      ${u.homeCard === 'nothing' ? '' : `<div class="home-card">${cards[u.homeCard] || cards.briefing}<button class="card square" id="cardSettings" aria-label="Home card settings">${icon('tune')}</button></div>`}
    </div>`,
    mount(root) {
      bindAsk(root);
      // Arrived from Search → "Ask Bridge": the question is filled in, ready to send
      if (sessionStorage.getItem('bridge-ask')) { sessionStorage.removeItem('bridge-ask'); const q = root.querySelector('#q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
      root.querySelectorAll('[data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go)));
      root.querySelectorAll('[data-suggest]').forEach((b) => (b.onclick = () => { root.querySelector('#q').value = b.dataset.suggest; root.querySelector('#q').focus(); }));
      root.querySelector('#cardSettings')?.addEventListener('click', () => {
        const opts = [['briefing', 'Briefing snapshot', 'Updates each time Morning Briefing runs'], ['reviews', 'Papers to sign', 'Live count from My Reviews'], ['skill', 'A skill’s result', 'Latest result from a skill, e.g. Friday deferred papers'], ['nothing', 'Nothing', 'Just the greeting and the ask bar']];
        const m = modal({
          title: 'Home card', iconName: 'tune',
          body: `<p class="muted">This card sits under the ask bar. By default it’s a snapshot of your briefing. Choose what it shows.</p>
            <div class="list">${opts.map(([k, t, d]) => `<label class="list-row" style="cursor:pointer"><input type="radio" class="am-radio" name="hc" value="${k}" ${u.homeCard === k ? 'checked' : ''}/><div class="grow"><b>${t}</b><div class="small muted">${d}</div></div></label>`).join('')}</div>
            <p class="small muted">Tip: you can also just say “show me papers to sign on Home”.</p>`,
          foot: `<button class="btn tertiary sm" data-close>Cancel</button><button class="btn primary sm" id="done">Done</button>`,
        });
        m.el.querySelector('#done').onclick = async () => { const v = m.el.querySelector('input:checked').value; await api.update('users', 'u-pm', { homeCard: v }); state.user.homeCard = v; m.close(); rerender(); };
      });
    },
  };
}

async function brief() {
  const b = (await api.list('briefing'))[0];
  const e = b.economy;
  const max = Math.max(...e.arrivals2025, ...e.arrivals2026.filter(Boolean));
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const past = (v) => /OK/.test(v) ? `<span class="status success">${esc(v)}</span>` : `<span class="status danger">${esc(v)}</span>`;
  return {
    title: 'Daily brief',
    html: `<div class="thread brief">
      <div class="brief-head"><div class="grow"><div class="date">${esc(b.date)} · prepared ${esc(b.prepared)}</div><h1>Daily brief</h1></div>
        <button class="listen-btn" id="listen"><span class="lead">${icon('headset', 's16')}</span>Listen · ${esc(b.listen)}</button><button class="icon-btn" aria-label="More">${icon('more')}</button></div>
      <div class="song"><span class="tile"><img src="img/emoji/song.svg" alt="" width="32" height="32"></span><div class="grow txt"><span class="lbl">Song of the day · classic dub</span><b>${esc(b.song.title)}</b><span class="lbl">${esc(b.song.artist)} · ${esc(b.song.note)}</span></div><button class="icon-btn" aria-label="Play">${icon('play')}</button><button class="icon-btn" aria-label="Dismiss" id="hideSong">${icon('close')}</button></div>
      <p class="para">${esc(b.summary)}</p>
      <div class="stat-grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">${b.stats.map(statCard).join('')}</div>
      <p class="para">${esc(b.backlogNote)}</p>
      <div class="chart-card"><h5>Papers awaiting your signature · days waiting</h5>
        <div class="bars">${b.waiting.map((w) => `<div class="bar-row"><span class="l">${esc(w.title)}</span><div class="track"><div class="bar" style="width:${(w.days / 10.6) * 100}%"></div></div><span class="v">${w.days} days</span></div>`).join('')}</div>
        <p class="foot">Illustrative · Bridge counts days since each paper reached you</p></div>
      <div class="chart-card"><h5>Alignment check · this week’s papers</h5>
        <div class="align-table"><table><thead><tr><th>Paper</th><th>Mission Barbados</th><th>Covenant of Hope</th><th>Manifesto</th><th>Past decisions</th></tr></thead>
        <tbody>${b.alignment.map((a) => `<tr><td>${esc(a.paper)}</td><td>${a.mission}</td><td>${a.covenant}</td><td>${a.manifesto}</td><td>${past(a.past)}</td></tr>`).join('')}</tbody></table></div>
        <p class="foot">Scores 1 to 5 are advisory. Select any cell to see the quoted passage.</p></div>
      <p class="para">${esc(b.alignmentNote)}</p>
      <div class="econ"><div class="econ-head"><h3>The economy</h3><div class="meta">${esc(e.asOf)}</div></div>
      <p class="para">${esc(e.text)}</p>
      <div class="stat-grid">${e.stats.map(statCard).join('')}</div>
      <div class="chart-card"><div class="cap"><h5 class="grow">Tourist arrivals by month</h5><span class="lg"><i style="background:var(--am-brand)"></i>2026</span><span class="lg"><i></i>2025</span></div>
        <div class="plot">${months.map((m, i) => `<div class="month"><div class="mb"><span style="height:${(e.arrivals2025[i] / max) * 140}px"></span>${e.arrivals2026[i] ? `<span class="y" style="height:${(e.arrivals2026[i] / max) * 140}px"></span>` : ''}</div><span class="m">${m}</span></div>`).join('')}</div>
        <p class="foot">Illustrative · 2026 to date vs 2025 (thousands of arrivals)</p></div></div>
      ${followups(b.followups)}
      ${citations(b.citations, 'Select a number to see the highlighted passage, or open Knowledge trace to see how this brief was put together.')}
      ${actions}
      <p class="disclaimer">Sample content; economic figures are placeholders and charts illustrative. Bridge can make mistakes. Double check or cross reference.</p>
    </div>
    <div class="thread-composer">${askbar('Ask about this brief')}</div>`,
    mount(root) {
      bindAsk(root); bindActions(root);
      root.querySelector('#listen').onclick = () => toast('Playing your brief (prototype: no audio)');
      root.querySelector('#hideSong').onclick = (ev) => ev.currentTarget.closest('.song').remove();
    },
  };
}

// ---------------------------------------------------------------- Document panel (Figma 02 Research, flow 5)
// A draft Bridge writes from a thread opens in a secondary panel beside the chat
// (LC / Research / Chat with Document). The panel can be resized, closed and reopened from its card.
const DOC_TITLE = 'Cabinet note: Land administration system';
const DOC = {
  title: 'Protecting and replacing the land administration system',
  meta: 'Cabinet of Barbados · Ministry of Housing, Lands and Maintenance · Paper code K(A) · For decision',
  v1: [
    { id: 'moc', heading: '1. Matter for consideration', body: 'The land registry still works but is failing under load. The last full backup is 41 days old, and an audit found 6 process gaps, 2 of them critical [1][2]. This paper asks Cabinet to approve a staged plan to protect the data first, then replace the system.' },
    { id: 'dec', heading: '2. Decision requested', body: 'It is recommended that Cabinet:', bullets: ['approve an immediate full backup and a freeze on changes to the current system;', 'direct Lands and Surveys to close the 2 critical gaps within 8 weeks;', 'approve procurement of an off-the-shelf registry, funded in the 2026 Estimates [3].'] },
    { id: 'bg', heading: '3. Background', body: 'The registry holds 128k parcels. Three options were compared: repairing the current system, buying an off-the-shelf registry, or joining the CARICOM regional platform [4]. Repair is cheapest now but carries high risk; the off-the-shelf route balances speed and control.' },
    { id: 'fin', heading: '4. Financial implications', body: 'The backup and the gap fixes are met from the Ministry’s existing budget. The off-the-shelf registry is estimated at BBD 4.2 million over three years and is provided for in the 2026 Estimates [3].' },
  ],
  v2: [
    { id: 'moc', heading: '1. Matter for consideration', body: 'The land registry is failing under load, the last full backup is 41 days old, and 2 critical process gaps are open [1][2]. This paper asks Cabinet to approve a staged plan.' },
    { id: 'dec', heading: '2. Decision requested', body: 'It is recommended that Cabinet:', bullets: ['approve an immediate backup and a change freeze;', 'approve procurement of an off-the-shelf registry [3].'] },
    { id: 'tl', heading: '3. Timeline', lines: ['Weeks 1–2: back up and verify every record.', 'Week 2: freeze changes to the old system.', 'Weeks 2–8: close the 2 critical gaps.', 'Weeks 4–10: choose the replacement.', 'From month 3: migrate one parish at a time.'] },
  ],
};
const docSections = (d) => (d.version === 2 ? DOC.v2 : DOC.v1).slice(0, d.stage === 'writing' ? d.shown || 1 : undefined);
const docMeta = (d, closed) => d.stage === 'writing' ? `Writing… ${d.shown || 1} of 4 sections` : `Document · v${d.version} · 4 sources${closed ? ' · Click to open' : ''}`;
const docCard = (d, v, closed) => `<button class="doc-card" data-open-doc="${v}"><span class="doc-tile">${icon('list')}</span><span class="txt"><b>${DOC_TITLE}</b><span>${esc(docMeta({ ...d, version: v, stage: v === d.version ? d.stage : 'ready' }, closed))}</span></span><span class="icon-btn" data-doc-more aria-label="More">${icon('more')}</span></button>`;
function docPanel(d) {
  const w = d.stage === 'writing';
  const sub = w ? 'Bridge is writing · from “Land administration options”' : d.version === 2 ? 'Draft by Bridge · v2 · updated just now' : 'Draft by Bridge · v1 · from “Land administration options”';
  const pill = w ? 'Bridge is writing…' : d.version === 2 ? 'Updated by Bridge · v2' : 'Drafted by Bridge · 4 sources';
  const foot = w ? 'Writing · 4 sources' : d.version === 2 ? '184 words · 4 sources cited · v2' : '312 words · 4 sources cited';
  const secs = docSections(d).map((s) => `<h2>${esc(s.heading)}</h2>${s.body ? `<p>${esc(s.body)}</p>` : ''}${s.bullets ? `<ul>${s.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}${s.lines ? `<p>${s.lines.map(esc).join('<br>')}</p>` : ''}`).join('');
  return `<aside class="doc-panel" aria-label="${DOC_TITLE}">
    <div class="doc-panel-head"><div class="title"><b>${DOC_TITLE}</b><span>${sub}</span></div>
      ${w ? '<button class="am-btn am-btn--tertiary am-btn--xs" id="stopDoc">Stop writing</button>' : '<button class="am-btn am-btn--tertiary am-btn--xs" id="openCreate">Open in Create</button>'}
      <button class="icon-btn" id="docHistory" aria-label="Version history" data-popover-anchor>${icon('history')}</button><button class="icon-btn" id="docMore" aria-label="More" data-popover-anchor>${icon('more')}</button>
      <button class="chip-btn" id="closeDoc" aria-label="Close document">${icon('close', 's16')}</button></div>
    <div class="doc-panel-scroll"><article class="sheet"><span class="status-chip doc-pill">${pill}</span><h1>${esc(DOC.title)}</h1><p class="meta">${esc(DOC.meta)}</p>${secs}${w ? '<p class="writing-caret" aria-hidden="true"></p>' : ''}</article></div>
    <div class="doc-foot">${foot}</div></aside>`;
}

// Conversation header (Figma: organism / research / conversation header). Spans the chat and the document panel.
const convoHeader = (id, name, answered) => `<header class="convo-head">
  <nav class="breadcrumb" aria-label="Path"><a href="#/research">Research</a>${icon('right', 's16')}<span class="current">${esc(name)}</span></nav>
  <span class="spacer"></span>
  <button class="btn tertiary sm" id="hTrace" ${answered ? '' : 'disabled title="Available once Bridge has answered"'}>Knowledge trace</button>
  <button class="btn tertiary sm" id="hExport" data-popover-anchor>Export</button>
  <button class="btn secondary sm" id="hShare">Share</button>
  <button class="icon-btn" id="hMore" aria-label="More" data-popover-anchor>${icon('more')}</button></header>`;
const threadName = (t) => t.name || (t.question.length > 40 ? t.question.slice(0, 38).trim() + '…' : t.question);

function bindHeader(root, t, id) {
  root.querySelector('#hTrace')?.addEventListener('click', () => go(`#/research/thread/${id}/trace`));
  root.querySelector('#hShare').onclick = () => toast('Link copied. Only people in your government can open it (prototype)');
  root.querySelector('#hExport').onclick = (e) => {
    const pop = popover(e.currentTarget, `<button class="menu-item" data-f="PDF">${icon('download', 's16')}PDF</button><button class="menu-item" data-f="Word">${icon('download', 's16')}Word</button>`, { align: 'right' });
    pop.onclick = (ev) => { const f = ev.target.closest('[data-f]')?.dataset.f; if (f) { closePopovers(); toast(`Conversation exported as ${f} (prototype)`); } };
  };
  root.querySelector('#hMore').onclick = (e) => {
    const pop = popover(e.currentTarget, `<button class="menu-item" data-a="rename">${icon('edit', 's16')}Rename</button><button class="menu-item" data-a="pin">${icon('pin', 's16')}${t.pinned ? 'Unpin' : 'Pin'}</button><div class="menu-sep"></div><button class="menu-item danger" data-a="delete">${icon('trash', 's16')}Delete</button>`, { align: 'right' });
    pop.onclick = async (ev) => {
      const a = ev.target.closest('[data-a]')?.dataset.a; if (!a) return; closePopovers();
      if (a === 'pin') { await api.update('threads', id, { pinned: !t.pinned }); toast(t.pinned ? 'Unpinned' : 'Pinned to the top of Recent'); rerender(); }
      if (a === 'rename') {
        const m = modal({ title: 'Rename conversation', iconName: 'edit', body: `<div class="field"><label for="rn">Name</label><input class="input" id="rn" value="${esc(threadName(t))}"></div>`, foot: '<button class="btn tertiary sm" data-close>Cancel</button><button class="btn primary sm" id="rnSave">Save</button>' });
        const inp = m.el.querySelector('#rn'); inp.focus(); inp.select();
        const saveName = async () => { const v = inp.value.trim(); if (!v) return inp.focus(); await api.update('threads', id, { name: v }); const rc = (await api.list('recent')).find((r) => r.route === '#/research/thread/' + id); if (rc) await api.update('recent', rc._id, { title: v }); m.close(); rerender(); };
        m.el.querySelector('#rnSave').onclick = saveName; inp.onkeydown = (k) => { if (k.key === 'Enter') saveName(); };
      }
      if (a === 'delete') {
        const m = modal({ title: 'Delete conversation?', iconName: 'trash', body: `<p class="muted">“${esc(threadName(t))}” and its drafts will be deleted. This can’t be undone.</p>`, foot: '<button class="btn tertiary sm" data-close>Cancel</button><button class="btn danger sm" id="del">Delete</button>' });
        m.el.querySelector('#del').onclick = async () => { await api.remove('threads', id); const rc = (await api.list('recent')).find((r) => r.route === '#/research/thread/' + id); if (rc) await api.remove('recent', rc._id); m.close(); toast('Conversation deleted'); go('#/research'); };
      }
    };
  };
}

async function thread(id) {
  const t = await api.get('threads', id);
  if (!t) return { html: '<div class="page">Not found</div>' };
  const stage = t.stage || 'answered';
  const bl = (label) => `<div class="bridge-line">${orb('sm', state.user.agentLook, stage === 'working' ? 'thinking' : '')}<span>${label}</span><span class="time">${esc(t.time)}</span></div>`;
  let body = '';
  if (stage === 'plan') body = `${bl('Before I start, here’s my plan.')}
    <div class="plan-card">${t.plan.map((p) => `<div><div class="k">${esc(p.title)}</div><div>${esc(p.text)}</div></div>`).join('')}
    <div class="row"><button class="btn primary sm" id="approve">Start</button><button class="btn tertiary sm" id="scope">Change the scope</button></div></div>`;
  if (stage === 'working') body = `${bl('Working on it. You can keep using Bridge.')}
    <div class="plan-card steps-list" id="steps">${t.steps.map((s) => `<div class="s"><span class="spinner"></span>${esc(s)}</div>`).join('')}</div>`;
  if (stage === 'answered') {
    const a = t.answer;
    body = `${bl(`Here’s what I found. ${a.sources.length} sources, about 2 minutes.`)}
      <div class="answer ${(t.extra || []).length ? 'flat' : ''}"><p>${esc(a.summary)}</p>
      <h4>Where things stand</h4><div class="stat-grid">${a.stats.map(statCard).join('')}</div>
      <h4>Recommended order</h4><div class="order">${a.order.map((o, i) => `<div class="item"><span class="num">${i + 1}</span><div class="txt"><div class="tr"><b>${esc(o.title)}</b><span class="when">${esc(o.when)}</span></div><p>${esc(o.text)}</p></div></div>`).join('')}</div>
      ${a.options ? `<h4>Options compared</h4><div class="opt-grid">${a.options.map((o) => `<div class="opt-card"><span class="emoji">${/\.svg$/.test(o.icon) ? `<img src="${o.icon}" alt="" width="24" height="24">` : o.icon}</span><b>${esc(o.name)}</b><span class="d">${esc(o.text)}</span><span class="status ${o.tone}">${esc(o.risk)}</span></div>`).join('')}</div>` : ''}
      ${a.recommendation ? `<p>${esc(a.recommendation)}</p>` : ''}
      ${a.followups ? followups(a.followups) : ''}
      ${citations(a.sources)}
      ${actions}</div>`;
  }
  const d = t.doc;
  const open = d && d.open;
  const extra = (t.extra || []).map((m) => m.role === 'user' ? `<div class="bubble-user">${esc(m.text)}</div>`
    : `<div class="bridge-line">${orb('sm', state.user.agentLook, d && d.stage === 'writing' && m.doc === d.version ? 'thinking' : '')}<span>${esc(m.doc && m.doc === d.version && d.stage === 'writing' ? 'Drafting a Cabinet note. You can keep chatting.' : m.doc === 1 && !open && !(t.extra || []).some((x) => x.doc === 2) ? 'Done. Your draft is in the card below.' : m.text)}</span><span class="time">${esc(m.time)}</span></div>${m.doc ? docCard(d, m.doc, !open) : ''}`).join('');
  return {
    title: 'Ask Bridge',
    html: `<div class="chat-layout ${open ? 'has-doc' : ''}" style="${d && d.width ? `--doc-w:${d.width}px` : ''}">${convoHeader(id, threadName(t), stage === 'answered')}<div class="chat-body"><section class="chat-col"><div class="chat-scroll"><div class="thread"><div class="bubble-user">${esc(t.question)}</div>${body}${extra}</div></div>
      <div class="thread-composer">${askbar('Reply to Bridge')}<p class="note">Bridge can make mistakes. Double check or cross reference.</p></div></section>
      ${open ? `<div class="resize-handle" role="separator" aria-orientation="vertical" aria-label="Resize document panel" tabindex="0"><span></span></div>${docPanel(d)}` : ''}</div></div>`,
    async mount(root) {
      bindActions(root, id); bindHeader(root, t, id);
      root.querySelectorAll('.askbar .switch').forEach((sw) => (sw.onclick = () => sw.setAttribute('aria-checked', sw.getAttribute('aria-checked') !== 'true')));
      const q = root.querySelector('#q');
      const fu = sessionStorage.getItem('bridge-followup');
      if (fu) { sessionStorage.removeItem('bridge-followup'); q.value = fu; setTimeout(() => { q.focus(); q.setSelectionRange(fu.length, fu.length); }, 0); }
      const now = () => 'Today, ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const save = (f) => api.update('threads', id, f);
      const write = async (version) => {
        for (let n = 1; n <= (version === 2 ? 3 : 4); n++) {
          await save({ doc: { ...((await api.get('threads', id)).doc), stage: 'writing', version, shown: n, open: true } });
          if (location.hash !== '#/research/thread/' + id) return; rerender(); await sleep(900);
          const cur = (await api.get('threads', id)).doc; if (cur.stage !== 'writing') return;
        }
        await save({ doc: { ...((await api.get('threads', id)).doc), stage: 'ready' } });
        if (location.hash === '#/research/thread/' + id) rerender();
      };
      q.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); root.querySelector('#ask').requestSubmit(); } });
      root.querySelector('#ask').onsubmit = async (e) => {
        e.preventDefault();
        const text = q.value.trim(); if (!text) return q.focus();
        const ex = t.extra || [];
        if (/cabinet note|draft/i.test(text) && !d) {
          await save({ extra: [...ex, { role: 'user', text }, { role: 'bridge', text: 'Done. The draft is open on the right.', time: now(), doc: 1 }], doc: { version: 1, stage: 'writing', shown: 1, open: true } });
          rerender(); return write(1);
        }
        if (d && d.stage === 'ready') {
          await save({ extra: [...ex, { role: 'user', text }, { role: 'bridge', text: 'Updated to v2: shorter, with a timeline.', time: now(), doc: 2 }], doc: { ...d, version: 2, stage: 'writing', shown: 1, open: true } });
          rerender(); return write(2);
        }
        const tpl = await api.get('threads', 'th-land');
        const { _id, createdAt, updatedAt, extra: _e, doc: _d, ...rest } = tpl;
        const nt = await api.create('threads', { ...rest, question: text, stage: 'plan', time: now() });
        go('#/research/thread/' + nt._id);
      };
      root.querySelectorAll('[data-follow]').forEach((b) => (b.onclick = () => {
        q.value = b.dataset.follow === 'Draft a Cabinet note' ? 'Draft a Cabinet note from this for Thursday’s meeting.' : b.dataset.follow; q.focus();
      }));
      root.querySelectorAll('[data-open-doc]').forEach((b) => (b.onclick = async (e) => {
        if (e.target.closest('[data-doc-more]')) { const pop = popover(e.target.closest('[data-doc-more]'), `<button class="menu-item" data-a="open">${icon('eye', 's16')}Open</button><button class="menu-item" data-a="create">${icon('edit', 's16')}Open in Create</button>`, { align: 'right' }); pop.onclick = (ev) => { const a = ev.target.closest('[data-a]')?.dataset.a; closePopovers(); if (a === 'open') b.click(); if (a === 'create') openInCreate(); }; return; }
        await save({ doc: { ...d, version: +b.dataset.openDoc, open: true } }); rerender();
      }));
      const openInCreate = async () => {
        const v = (await api.get('threads', id)).doc.version;
        const nd = await api.create('documents', { title: DOC.title, template: 'Cabinet Paper', status: `Draft by Bridge · v${v}`, owner: 'You', modified: 'Just now', section: 'mine', sections: [{ id: 'meta', heading: null, style: 'meta', body: DOC.meta }, ...(v === 2 ? DOC.v2 : DOC.v1).map((x) => ({ ...x, body: x.lines ? x.lines.join(' ') : x.body, lines: undefined }))], sources: t.answer.sources, messages: [], suggestions: [], order: -1 });
        go('#/create/doc/' + nd._id);
      };
      root.querySelector('#openCreate')?.addEventListener('click', openInCreate);
      root.querySelector('#stopDoc')?.addEventListener('click', async () => { await save({ doc: { ...d, stage: 'ready' } }); rerender(); });
      root.querySelector('#closeDoc')?.addEventListener('click', async () => { await save({ doc: { ...d, open: false } }); rerender(); });
      root.querySelector('#docHistory')?.addEventListener('click', (e) => {
        const has2 = (t.extra || []).some((m) => m.doc === 2);
        const pop = popover(e.currentTarget, `<div class="menu-label">Versions</div>${(has2 ? [2, 1] : [1]).map((v) => `<button class="menu-item ${v === d.version ? 'active' : ''}" data-v="${v}">v${v}${v === 2 ? ' · shorter, with a timeline' : ' · first draft'}</button>`).join('')}`, { align: 'right' });
        pop.onclick = async (ev) => { const b = ev.target.closest('[data-v]'); if (!b) return; closePopovers(); await save({ doc: { ...d, version: +b.dataset.v, stage: 'ready' } }); rerender(); };
      });
      root.querySelector('#docMore')?.addEventListener('click', (e) => {
        const pop = popover(e.currentTarget, `<button class="menu-item" data-a="copy">${icon('copy', 's16')}Copy text</button><button class="menu-item" data-a="export">${icon('download', 's16')}Download as PDF</button>`, { align: 'right' });
        pop.onclick = (ev) => { const a = ev.target.closest('[data-a]')?.dataset.a; if (!a) return; closePopovers(); toast(a === 'copy' ? 'Copied to clipboard' : 'Downloading PDF (prototype)'); };
      });
      // Resizable panel: drag the handle (default 560px, min 400, max 60% of the main area)
      const h = root.querySelector('.resize-handle');
      if (h) {
        const lay = root.querySelector('.chat-layout'); const body = root.querySelector('.chat-body');
        const setW = (w) => { const max = body.clientWidth * 0.6; w = Math.max(400, Math.min(max, w)); lay.style.setProperty('--doc-w', w + 'px'); return w; };
        h.onpointerdown = (ev) => { h.setPointerCapture(ev.pointerId); const r = body.getBoundingClientRect(); h.onpointermove = (m) => setW(r.right - m.clientX); h.onpointerup = async () => { h.onpointermove = null; await save({ doc: { ...(await api.get('threads', id)).doc, width: parseInt(lay.style.getPropertyValue('--doc-w')) } }); }; };
        h.onkeydown = (ev) => { if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') { const cur = parseInt(getComputedStyle(lay).getPropertyValue('--doc-w')) || 560; setW(cur + (ev.key === 'ArrowLeft' ? 24 : -24)); } };
      }
      const sc = root.querySelector('.chat-scroll'); if (sc && d) sc.scrollTop = sc.scrollHeight;
      if (d && !open) { const m = root.closest('.main') || root; m.scrollTop = m.scrollHeight; }
      const ds = root.querySelector('.doc-panel-scroll'); if (ds && d && d.stage === 'writing') ds.scrollTop = ds.scrollHeight;
      root.querySelector('#approve')?.addEventListener('click', async () => { await api.update('threads', id, { stage: 'working' }); rerender(); });
      root.querySelector('#scope')?.addEventListener('click', () => { root.querySelector('#q').value = 'Focus only on protecting the data for now.'; root.querySelector('#q').focus(); });
      if (stage === 'working') {
        for (const s of root.querySelectorAll('#steps .s')) { await sleep(900); if (!document.body.contains(s)) return; s.querySelector('.spinner').outerHTML = `<span style="color:var(--success);display:flex">${icon('check', 's16')}</span>`; }
        await api.update('threads', id, { stage: 'answered' });
        if (location.hash === '#/research/thread/' + id) rerender();
      }
    },
  };
}
