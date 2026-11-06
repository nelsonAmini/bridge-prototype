import { api } from '../api.js';
import { icon, orb, esc, modal, sleep, toast } from '../ui.js';
import { state, go, render as rerender } from '../app.js';

// Ask bar = Amini Kit "AI Chatbox" (Config=Default)
export const askbar = (placeholder = 'Ask Bridge anything', value = '') => `<form class="askbar" id="ask">
  <textarea id="q" rows="1" placeholder="${placeholder}" aria-label="${placeholder}">${esc(value)}</textarea>
  <div class="tools"><span class="tool"><button type="button" class="switch" role="switch" aria-checked="false" aria-label="Web search"></button>Web search</span>
    <button type="button" class="tool">${icon('tune', 's16')}Tools</button><span class="spacer"></span>
    <button type="button" class="tool">${icon('add', 's16')}Add attachment</button>
    <button type="button" class="icon-btn outline" aria-label="Dictate">${icon('mic', 's16')}</button><button class="send" aria-label="Send">${icon('send', 's16')}</button></div></form>`;

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
const statCard = (s) => `<div class="stat"><div class="k">${esc(s.label)}</div><div class="v ${s.tone === 'bad' ? 'bad' : 'good'}">${esc(s.value)}${trend(s)}</div><div class="n">${esc(s.delta ?? s.note ?? '')}</div></div>`;
const actions = `<div class="answer-actions"><button type="button" data-act="copy">${icon('copy', 's16')}Copy</button><button type="button" data-act="export">${icon('export', 's16')}Export</button><button type="button" data-act="save">${icon('bookmark', 's16')}Save to My Reviews</button><button type="button" data-act="regen">${icon('regenerate', 's16')}Regenerate</button><span class="spacer"></span><button type="button" data-act="trace">${icon('trace', 's16')}Knowledge trace</button></div>`;
function bindActions(root) {
  root.querySelectorAll('.answer-actions [data-act]').forEach((b) => (b.onclick = () => toast({ copy: 'Copied to clipboard', export: 'Exported as PDF (prototype)', save: 'Saved to My Reviews', regen: 'Regenerating… (prototype)', trace: 'Knowledge trace opens the sources graph (prototype)' }[b.dataset.act])));
  root.querySelectorAll('[data-follow]').forEach((b) => (b.onclick = () => { const q = root.querySelector('#q'); q.value = b.dataset.follow; q.focus(); }));
}
const followups = (list) => `<div class="stack" style="--gap:8px"><h5>What would you like to know next?</h5><div class="follow-chips">${list.map((f) => `<button class="chip sm" data-follow="${esc(f)}">${icon('add', 's16')}${esc(f)}</button>`).join('')}</div></div>`;
const citations = (list, intro = '') => `<div class="stack" style="--gap:8px"><h4 style="margin:0">Citations</h4>${intro ? `<p class="small muted">${intro}</p>` : ''}<div class="cites">${list.map((s, i) => `<div><span>[${i + 1}]</span>${esc(s)}</div>`).join('')}</div></div>`;

export async function render(params, { route }) {
  if (route.pattern === 'research/brief') return brief();
  if (route.pattern === 'research/thread/:id') return thread(params.id);

  const u = state.user;
  const revs = await api.list('reviews');
  const toSign = revs.filter((r) => r.status === 'To sign').length;
  const cards = {
    briefing: `<button class="card" data-go="#/research/brief"><span class="icon-tile">${icon('sun')}</span><div class="grow"><b>Today’s briefing</b><div class="small muted">${toSign} to sign · 1 flagged · 3 min to listen</div></div>${icon('right', 's16')}</button>`,
    reviews: `<button class="card" data-go="#/reviews/tag/To%20sign"><span class="icon-tile">${icon('doc')}</span><div class="grow"><b>Papers to sign</b><div class="small muted">Live count from My Reviews: ${toSign}</div></div>${icon('right', 's16')}</button>`,
    skill: `<button class="card" data-go="#/skills"><span class="icon-tile">${icon('sparkle')}</span><div class="grow"><b>Friday deferred papers</b><div class="small muted">Latest result from a skill</div></div>${icon('right', 's16')}</button>`,
  };
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return {
    title: 'Research',
    html: `<div class="research-home">
      ${orb('lg', u.agentLook)}
      <h1>${greet}, ${esc(u.name)}</h1>
      <p class="greet-sub">${toSign} papers need your signature today.</p>
      ${askbar()}
      <div class="row wrap">${['Papers to sign', 'Check a paper', 'Dictate a letter'].map((s) => `<button class="chip sm lg" data-suggest="${s}">${icon('add', 's16')}${s}</button>`).join('')}</div>
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
    html: `<div class="thread" style="padding-top:40px">
      <div class="row" style="align-items:flex-end"><div class="grow"><div class="tiny muted">${esc(b.date)} · prepared ${esc(b.prepared)}</div><h1 style="font-weight:400;font-size:40px;line-height:48px">Daily brief</h1></div>
        <button class="btn secondary sm" id="listen" style="padding-left:4px"><span class="lead" style="background:#fff;color:#1a1a1a">${icon('headset', 's16')}</span>Listen · ${esc(b.listen)}</button><button class="icon-btn" aria-label="More">${icon('more')}</button></div>
      <div class="card song"><span class="cover"></span><div class="grow"><div class="tiny muted">Song of the day · classic dub</div><b class="small">${esc(b.song.title)}</b><div class="tiny muted">${esc(b.song.artist)} · ${esc(b.song.note)}</div></div><button class="icon-btn" aria-label="Play">${icon('play')}</button><button class="icon-btn" aria-label="Dismiss" id="hideSong">${icon('close')}</button></div>
      <p style="font-size:16px;line-height:25px">${esc(b.summary)}</p>
      <div class="stat-grid" style="grid-template-columns:repeat(4,1fr)">${b.stats.map(statCard).join('')}</div>
      <p style="font-size:16px;line-height:25px">${esc(b.backlogNote)}</p>
      <div class="card pad stack" style="--gap:12px;padding:24px"><h5>Papers awaiting your signature · days waiting</h5>
        <div class="bars">${b.waiting.map((w) => `<div class="bar-row"><span>${esc(w.title)}</span><div><div class="bar" style="width:${(w.days / 10) * 100}%"></div></div><span style="text-align:right">${w.days} days</span></div>`).join('')}</div>
        <p class="tiny muted">Illustrative · Bridge counts days since each paper reached you</p></div>
      <div class="card stack" style="--gap:12px;padding:24px"><h5>Alignment check · this week’s papers</h5>
        <div class="table-wrap" style="border:1px solid var(--border);border-radius:4px"><table class="table"><thead><tr style="background:var(--grey)"><th>Paper</th><th>Mission Barbados</th><th>Covenant of Hope</th><th>Manifesto</th><th>Past decisions</th></tr></thead>
        <tbody>${b.alignment.map((a) => `<tr><td>${esc(a.paper)}</td><td>${a.mission}</td><td>${a.covenant}</td><td>${a.manifesto}</td><td>${past(a.past)}</td></tr>`).join('')}</tbody></table></div>
        <p class="tiny muted">Scores 1 to 5 are advisory. Select any cell to see the quoted passage.</p></div>
      <p style="font-size:16px;line-height:25px">${esc(b.alignmentNote)}</p>
      <div><h4 style="margin:0">The economy</h4><div class="tiny muted">${esc(e.asOf)}</div></div>
      <p style="font-size:16px;line-height:25px">${esc(e.text)}</p>
      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">${e.stats.map(statCard).join('')}</div>
      <div class="card stack" style="--gap:16px;padding:24px"><div class="row"><h5 class="grow">Tourist arrivals by month</h5><span class="status warning tiny" style="color:#1a1a1a">2026</span><span class="status neutral tiny">2025</span></div>
        <div style="display:grid;grid-template-columns:repeat(12,1fr);gap:8px;align-items:end;height:160px">${months.map((m, i) => `<div style="display:flex;gap:3px;align-items:end;justify-content:center;height:100%"><span style="width:9px;height:${(e.arrivals2025[i] / max) * 100}%;background:var(--grey);border-radius:2px"></span>${e.arrivals2026[i] ? `<span style="width:9px;height:${(e.arrivals2026[i] / max) * 100}%;background:var(--brand);border-radius:2px"></span>` : ''}</div>`).join('')}</div>
        <div style="display:grid;grid-template-columns:repeat(12,1fr);gap:8px;text-align:center" class="tiny">${months.map((m) => `<span>${m}</span>`).join('')}</div>
        <p class="tiny muted">Illustrative · 2026 to date vs 2025 (thousands of arrivals)</p></div>
      ${followups(b.followups)}
      ${citations(b.citations, 'Select a number to see the highlighted passage, or open Knowledge trace to see how this brief was put together.')}
      ${actions}
      <p class="tiny muted">Sample content; economic figures are placeholders and charts illustrative. Bridge can make mistakes. Double check or cross reference.</p>
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
      <h4>Recommended order</h4><div class="order">${a.order.map((o, i) => `<div class="item"><span class="num">${i + 1}</span><div><b>${esc(o.title)}</b><span class="when">${esc(o.when)}</span><p>${esc(o.text)}</p></div></div>`).join('')}</div>
      ${a.options ? `<h4>Options compared</h4><div class="stat-grid">${a.options.map((o) => `<div class="stat" style="padding:16px;gap:8px"><span style="font-size:24px;line-height:32px">${o.icon}</span><b class="small" style="font-weight:700">${esc(o.name)}</b><span class="n">${esc(o.text)}</span><span class="status ${o.tone}">${esc(o.risk)}</span></div>`).join('')}</div>` : ''}
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
