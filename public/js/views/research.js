import { api } from '../api.js';
import { icon, orb, esc, modal, sleep, toast } from '../ui.js';
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
function bindActions(root) {
  root.querySelectorAll('.answer-actions [data-act]').forEach((b) => (b.onclick = () => toast({ copy: 'Copied to clipboard', export: 'Exported as PDF (prototype)', save: 'Saved to My Reviews', regen: 'Regenerating… (prototype)', trace: 'Knowledge trace opens the sources graph (prototype)' }[b.dataset.act])));
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
      ${askbar()}
      <div class="suggestions">${['Papers to sign', 'Check a paper', 'Dictate a letter'].map((s) => `<button class="prompt-chip" data-suggest="${s}">${icon('add', 's16')}${s}</button>`).join('')}</div>
      ${u.homeCard === 'nothing' ? '' : `<div class="home-card">${cards[u.homeCard] || cards.briefing}<button class="card square" id="cardSettings" aria-label="Home card settings">${icon('tune')}</button></div>`}
    </div>`,
    mount(root) {
      bindAsk(root);
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
      <div class="answer"><p>${esc(a.summary)}</p>
      <h4>Where things stand</h4><div class="stat-grid">${a.stats.map(statCard).join('')}</div>
      <h4>Recommended order</h4><div class="order">${a.order.map((o, i) => `<div class="item"><span class="num">${i + 1}</span><div class="txt"><div class="tr"><b>${esc(o.title)}</b><span class="when">${esc(o.when)}</span></div><p>${esc(o.text)}</p></div></div>`).join('')}</div>
      ${a.options ? `<h4>Options compared</h4><div class="opt-grid">${a.options.map((o) => `<div class="opt-card"><span class="emoji">${/\.svg$/.test(o.icon) ? `<img src="${o.icon}" alt="" width="24" height="24">` : o.icon}</span><b>${esc(o.name)}</b><span class="d">${esc(o.text)}</span><span class="status ${o.tone}">${esc(o.risk)}</span></div>`).join('')}</div>` : ''}
      ${a.recommendation ? `<p>${esc(a.recommendation)}</p>` : ''}
      ${a.followups ? followups(a.followups) : ''}
      ${citations(a.sources)}
      ${actions}</div>`;
  }
  return {
    title: 'Ask Bridge',
    html: `<div class="thread"><div class="bubble-user">${esc(t.question)}</div>${body}</div>
      <div class="thread-composer">${askbar('Reply to Bridge')}<p class="note">Bridge can make mistakes. Double check or cross reference.</p></div>`,
    async mount(root) {
      bindAsk(root); bindActions(root);
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
