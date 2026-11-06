import { api } from '../api.js';
import { icon, orb, esc, modal, sleep, toast } from '../ui.js';
import { state, go, render as rerender } from '../app.js';

const askbar = (placeholder = 'Ask Bridge anything', value = '') => `<form class="askbar" id="ask">
  <textarea id="q" rows="2" placeholder="${placeholder}" aria-label="Ask Bridge">${esc(value)}</textarea>
  <div class="tools"><span class="row small">${icon('web', 's16')} Web search</span><span class="row small">${icon('tune', 's16')} Tools</span><span class="spacer"></span><span class="row small">${icon('add', 's16')} Add attachment</span>
  <button type="button" class="icon-btn outline" aria-label="Dictate">${icon('mic')}</button><button class="send" aria-label="Send">${icon('send', 's16')}</button></div></form>`;

function bindAsk(root) {
  root.querySelector('#ask').onsubmit = async (e) => {
    e.preventDefault();
    const q = root.querySelector('#q').value.trim();
    if (!q) return;
    const tpl = await api.get('threads', 'th-land');
    const { _id, createdAt, updatedAt, ...rest } = tpl;
    const t = await api.create('threads', { ...rest, question: q, stage: 'plan', time: 'Just now' });
    go('#/research/thread/' + t._id);
  };
}

export async function render(params, { route }) {
  const u = state.user;
  if (route.pattern === 'research/brief') return brief();
  if (route.pattern === 'research/thread/:id') return thread(params.id);

  const revs = await api.list('reviews');
  const toSign = revs.filter((r) => r.status === 'To sign').length;
  const cards = {
    briefing: `<button class="card" data-go="#/research/brief">${icon('sun', 's24')}<div class="grow"><b>Today’s briefing</b><div class="small muted">${toSign} to sign · 1 flagged · 3 min to listen</div></div>${icon('right')}</button>`,
    reviews: `<button class="card" data-go="#/reviews/tag/To%20sign">${icon('doc', 's24')}<div class="grow"><b>Papers to sign</b><div class="small muted">Live count from My Reviews: ${toSign}</div></div>${icon('right')}</button>`,
    skill: `<button class="card" data-go="#/skills">${icon('sparkle', 's24')}<div class="grow"><b>Friday deferred papers</b><div class="small muted">Latest result from a skill</div></div>${icon('right')}</button>`,
    nothing: '',
  };
  return {
    title: 'Research',
    html: `<div class="research-home">
      ${orb('lg', u.agentLook)}
      <h1>Good morning, ${esc(u.name)}</h1>
      <p class="muted">${toSign} papers need your signature today.</p>
      ${askbar()}
      <div class="row wrap" style="justify-content:center">${['Papers to sign', 'Check a paper', 'Dictate a letter'].map((s) => `<button class="chip lg" data-suggest="${s}">${icon('add', 's16')}${s}</button>`).join('')}</div>
      ${u.homeCard === 'nothing' ? '' : `<div class="home-card">${cards[u.homeCard] || cards.briefing}<button class="icon-btn outline" style="width:52px;height:auto;border-radius:8px" id="cardSettings" aria-label="Home card settings">${icon('tune')}</button></div>`}
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
            <div class="list">${opts.map(([k, t, d]) => `<label class="list-row" style="cursor:pointer"><input type="radio" name="hc" value="${k}" ${u.homeCard === k ? 'checked' : ''}/><div class="grow"><b>${t}</b><div class="small muted">${d}</div></div></label>`).join('')}</div>
            <p class="small muted">Tip: you can also just say “show me papers to sign on Home”.</p>`,
          foot: `<button class="btn tertiary" data-close>Cancel</button><button class="btn primary" id="done">Done</button>`,
        });
        m.el.querySelector('#done').onclick = async () => { const v = m.el.querySelector('input:checked').value; await api.update('users', 'u-pm', { homeCard: v }); state.user.homeCard = v; m.close(); rerender(); };
      });
    },
  };
}

async function brief() {
  const b = (await api.list('briefing'))[0];
  const cell = (v) => `<td><span class="status ${v === 'Aligned' || v === 'No conflict' ? 'success' : v === 'Conflict' ? 'danger' : 'warning'}">${esc(v)}</span></td>`;
  return {
    title: 'Daily brief',
    html: `<div class="page"><div class="page-narrow stack" style="--gap:24px;max-width:860px">
      <div class="row"><div class="grow"><div class="small muted">${esc(b.date)} · prepared ${esc(b.prepared)}</div><h1>Daily brief</h1></div><button class="btn secondary" id="listen"><span class="lead">${icon('play', 's16')}</span>Listen · ${esc(b.listen)}</button></div>
      <div class="card pad row">${icon('play')}<div class="grow"><div class="small muted">Song of the day · classic dub</div><b>${esc(b.song.title)}</b><div class="small muted">${esc(b.song.artist)} · ${esc(b.song.note)}</div></div></div>
      <p style="font-size:17px">${esc(b.summary)}</p>
      <div class="stat-grid">${b.stats.map((s) => `<div class="card stat"><div class="small muted">${esc(s.label)}</div><div class="v">${esc(s.value)}</div><div class="small muted">${esc(s.delta)}</div></div>`).join('')}</div>
      <div class="stack" style="--gap:10px"><h4>Papers awaiting your signature · days waiting</h4><p class="muted">${esc(b.backlogNote)}</p>
        <div class="card pad stack" style="--gap:10px">${b.waiting.map((w) => `<div class="row"><span style="width:340px" class="small">${esc(w.title)}</span><div class="grow progress" style="height:14px"><span style="width:${w.days * 10}%;background:${w.days > 5 ? 'var(--danger)' : 'var(--brand)'}"></span></div><span class="small">${w.days} days</span></div>`).join('')}</div>
        <p class="small muted">Illustrative · Bridge counts days since each paper reached you.</p></div>
      <div class="stack" style="--gap:10px"><h4>Alignment check · this week’s papers</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>Paper</th><th>Mission Barbados</th><th>Covenant of Hope</th><th>Manifesto</th><th>Past decisions</th></tr></thead>
        <tbody>${b.alignment.map((a) => `<tr><td>${esc(a.paper)}</td>${cell(a.mission)}${cell(a.covenant)}${cell(a.manifesto)}${cell(a.past)}</tr>`).join('')}</tbody></table></div></div>
      <div class="row"><a class="btn primary" href="#/reviews/tag/To%20sign">Open papers to sign</a><a class="btn tertiary" href="#/research">Ask about this brief</a></div>
    </div></div>`,
    mount(root) { root.querySelector('#listen').onclick = () => toast('Playing your brief (prototype: no audio)'); },
  };
}

async function thread(id) {
  const t = await api.get('threads', id);
  if (!t) return { html: '<div class="page">Not found</div>' };
  const stage = t.stage || 'answered';
  const bl = (label) => `<div class="bridge-line">${orb('sm', state.user.agentLook, stage === 'working' ? 'thinking' : '')}<span>${label}</span><span class="time">${esc(t.time)}</span></div>`;
  let body = '';
  if (stage === 'plan') body = `${bl('Before I start, here’s my plan.')}
    <div class="card pad stack">${t.plan.map((p) => `<div><div class="small muted">${esc(p.title)}</div><div>${esc(p.text)}</div></div>`).join('')}
    <div class="row"><button class="btn primary" id="approve">Start</button><button class="btn tertiary" id="scope">Change the scope</button></div></div>`;
  if (stage === 'working') body = `${bl('Working on it. You can keep using Bridge.')}
    <div class="card pad steps-list" id="steps">${t.steps.map((s) => `<div class="s"><span class="spinner"></span>${esc(s)}</div>`).join('')}</div>`;
  if (stage === 'answered') {
    const a = t.answer;
    body = `${bl(`Here’s what I found. ${a.sources.length} sources, about 2 minutes.`)}
      <p style="font-size:16px">${esc(a.summary)}</p>
      <h4>Where things stand</h4><div class="stat-grid">${a.stats.map((s) => `<div class="card stat"><div class="small muted">${esc(s.label)}</div><div class="v">${esc(s.value)}</div><div class="small muted">${esc(s.note)}</div></div>`).join('')}</div>
      <h4>Recommended order</h4><div class="timeline">${a.order.map((o) => `<div class="item"><span class="small muted">${esc(o.when)}</span><div><b>${esc(o.title)}</b><p class="muted">${esc(o.text)}</p></div></div>`).join('')}</div>
      <h4>Sources</h4><div class="sources">${a.sources.map((s, i) => `<div><span>[${i + 1}]</span>${esc(s)}</div>`).join('')}</div>`;
  }
  return {
    title: 'Ask Bridge',
    html: `<div class="thread"><div class="bubble-user">${esc(t.question)}</div>${body}</div>
      <div class="thread-composer">${askbar('Ask a follow-up')}</div>`,
    async mount(root) {
      bindAsk(root);
      root.querySelector('#approve')?.addEventListener('click', async () => { await api.update('threads', id, { stage: 'working' }); rerender(); });
      root.querySelector('#scope')?.addEventListener('click', () => { root.querySelector('#q').value = 'Focus only on protecting the data for now.'; root.querySelector('#q').focus(); });
      if (stage === 'working') {
        for (const s of root.querySelectorAll('#steps .s')) { await sleep(900); if (!document.body.contains(s)) return; s.querySelector('.spinner').outerHTML = `<span style="color:var(--success)">${icon('check', 's16')}</span>`; }
        await api.update('threads', id, { stage: 'answered' });
        if (location.hash === '#/research/thread/' + id) rerender();
      }
    },
  };
}
