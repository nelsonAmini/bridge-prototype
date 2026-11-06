import { api } from '../api.js';
import { icon, esc, orb, modal, toast, sleep } from '../ui.js';
import { state, go, refreshUser, signOut, setTheme, render as rerender } from '../app.js';

// Skills, How you work and Settings (Figma page 06)
export async function render(params, { route }) {
  if (route.pattern === 'skills/how') return how();
  if (route.pattern === 'settings') return settings();
  return home();
}

const sw = (on, attrs = '') => `<button class="switch" role="switch" aria-checked="${!!on}" ${attrs}></button>`;

async function home() {
  const u = state.user;
  const skills = (await api.list('skills')).filter((s) => !s.hidden && !s.dismissed);
  const mine = skills.filter((s) => !s.suggested), sugg = skills.filter((s) => s.suggested);
  return {
    title: 'Skills',
    html: `<div class="page"><div class="page-narrow stack" style="--gap:24px;max-width:800px">
      <div class="card pad row" style="gap:16px">${orb('lg', u.agentLook)}<div class="grow"><h2>${esc(u.agentName)}</h2><p class="muted small">Your agent · ${mine.filter((s) => s.on).length} skills on · never signs, sends or decides for you</p></div><button class="btn secondary sm" id="editAgent">Edit</button></div>
      <div class="list">
        <button class="list-row" id="instr">${icon('edit', 's16')}<div class="grow" style="text-align:left"><b>Instructions</b><div class="small muted">How ${esc(u.agentName)} should write and what it should never do</div></div>${icon('right', 's16')}</button>
        <a class="list-row" href="#/skills/how">${icon('sparkle', 's16')}<div class="grow"><b>How you work</b><div class="small muted">What ${esc(u.agentName)} has learned about you</div></div>${icon('right', 's16')}</a>
        <button class="list-row" id="ask">${icon('info', 's16')}<div class="grow" style="text-align:left"><b>When to act or ask</b><div class="small muted">Always ask before sharing, sending or changing a paper</div></div>${icon('right', 's16')}</button></div>
      <div class="row"><h3 class="grow">Skills</h3><button class="btn primary sm" id="newSkill"><span class="lead">${icon('add', 's16')}</span>New skill</button></div>
      <div class="list">${mine.map((s) => `<div class="list-row"><div class="grow"><b>${esc(s.name)}</b><div class="small muted">${esc(s.schedule)}${s.description ? ' · ' + esc(s.description) : ''}</div></div><button class="btn tertiary sm" data-edit="${s._id}">Edit</button>${sw(s.on, `data-skill="${s._id}" aria-label="${esc(s.name)}"`)}</div>`).join('')}</div>
      ${sugg.length ? `<div class="stack" style="--gap:10px"><h4>Suggested</h4>${sugg.map((s) => `<div class="card pad row">${orb('sm', u.agentLook)}<div class="grow"><b>${esc(s.name)}</b><div class="small muted">${esc(s.schedule)}</div></div><button class="btn tertiary sm" data-dismiss="${s._id}">Dismiss</button><button class="btn secondary sm" data-add="${s._id}">Add</button></div>`).join('')}</div>` : ''}
    </div></div>`,
    mount(root) {
      root.querySelectorAll('[data-skill]').forEach((b) => (b.onclick = async () => { const on = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', on); await api.update('skills', b.dataset.skill, { on }); toast(on ? 'Skill turned on' : 'Skill paused'); }));
      root.querySelectorAll('[data-add]').forEach((b) => (b.onclick = async () => { await api.update('skills', b.dataset.add, { suggested: false, on: true, schedule: 'Mon and Wed, 8:00 AM' }); toast('Skill added'); rerender(); }));
      root.querySelectorAll('[data-dismiss]').forEach((b) => (b.onclick = async () => { await api.update('skills', b.dataset.dismiss, { dismissed: true }); rerender(); }));
      root.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => toast('Editing opens the same 3 steps as New skill (prototype)')));
      root.querySelector('#editAgent').onclick = () => go('#/onboarding/1');
      root.querySelector('#instr').onclick = () => textModal('Instructions', 'Write in plain British English. Summary first. Never share a Confidential paper outside the Cabinet Office.');
      root.querySelector('#ask').onclick = () => textModal('When to act or ask', 'Act on its own: summarise, tag, file and remind.\nAlways ask first: share, send, change a paper, or contact anyone.');
      root.querySelector('#newSkill').onclick = () => newSkill();
    },
  };
}

function textModal(title, value) {
  const m = modal({ title, iconName: 'edit', body: `<textarea class="textarea" style="min-height:140px">${esc(value)}</textarea>`, foot: `<button class="btn tertiary" data-close>Cancel</button><button class="btn primary" id="ok">Save</button>` });
  m.el.querySelector('#ok').onclick = () => { m.close(); toast('Saved'); };
}

function newSkill() {
  let step = 1;
  const data = { desc: '', name: 'Friday deferred papers', days: ['Fri'], time: '4:00 PM', repeat: 'Every week' };
  const STEPS = ['Describe', 'Review', 'Schedule'];
  const m = modal({ title: 'New skill', iconName: 'sparkle', wide: true, body: '<div id="ns"></div>', foot: '<div id="nsf" class="row" style="width:100%"></div>' });
  const draw = () => {
    const head = `<div class="steps">${STEPS.map((s, i) => `<div class="step ${i + 1 <= step ? 'active' : ''}"><span class="num">${i + 1 < step ? '✓' : i + 1}</span>${s}</div>`).join('<span class="step-line"></span>')}</div>`;
    let body = '';
    if (step === 1) body = `<p class="muted">Describe what you want ${esc(state.user.agentName)} to do, in your own words.</p>
      <textarea class="textarea" id="desc" style="min-height:110px" placeholder="e.g. Every Friday, tell me which papers were deferred this week and why">${esc(data.desc)}</textarea>
      <div class="row wrap"><button class="btn tertiary sm"><span class="lead">${icon('mic', 's16')}</span>Dictate</button>${['Deferred papers each Friday', 'Remind me of unsigned papers', 'Weekly speech digest'].map((c) => `<button class="chip" data-chip="${c}">${c}</button>`).join('')}</div>`;
    if (step === 2) body = `<div class="field"><label for="sname">Name</label><input class="input" id="sname" value="${esc(data.name)}"></div>
      <div class="stack" style="--gap:8px"><span class="label">Plan</span><ol class="stack" style="--gap:6px;padding-left:20px">${['Find papers marked Deferred in this week’s Cabinet folders', 'Group them by ministry and note the reason', 'Send you a short summary in Research'].map((s) => `<li>${s}</li>`).join('')}</ol><button class="btn tertiary sm" style="align-self:flex-start">Change a step</button></div>
      <div class="row wrap"><div class="card pad grow"><div class="small muted">Reads</div><b>My Reviews, Cabinet dates</b></div><div class="card pad grow"><div class="small muted">Can it act?</div><b>No. It only reports to you</b></div></div>
      <button class="btn secondary sm" id="try" style="align-self:flex-start"><span class="lead">${icon('play', 's16')}</span>Try it now</button><div id="tryOut"></div>`;
    if (step === 3) body = `<div class="tabs"><button class="tab active">On a schedule</button><button class="tab">When something happens</button></div>
      <div class="stack" style="--gap:8px"><span class="label">Days</span><div class="row wrap">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<button class="chip ${data.days.includes(d) ? 'selected' : ''}" data-day="${d}">${d}</button>`).join('')}</div></div>
      <div class="row"><div class="field grow"><label>Time</label><select class="select" id="time">${['8:00 AM', '12:00 PM', '4:00 PM', '6:00 PM'].map((t) => `<option ${t === data.time ? 'selected' : ''}>${t}</option>`).join('')}</select></div><div class="field grow"><label>Repeat</label><select class="select" id="rep">${['Every week', 'Every 2 weeks', 'Once'].map((t) => `<option ${t === data.repeat ? 'selected' : ''}>${t}</option>`).join('')}</select></div></div>
      <div class="row">${sw(true)}<span>Notify me when it runs</span></div><div class="row">${sw(false)}<span>Read the result aloud</span></div>
      <p class="small muted">First run: ${esc(data.days[0] || 'Fri')} at ${esc(data.time)}</p>`;
    m.el.querySelector('#ns').innerHTML = `<div class="stack" style="--gap:16px">${head}${body}</div>`;
    m.el.querySelector('#nsf').innerHTML = `${step > 1 ? '<button class="btn tertiary" id="back">Back</button>' : ''}<span class="spacer"></span><button class="btn tertiary" data-close>Cancel</button><button class="btn primary" id="nx">${step === 3 ? 'Save skill' : 'Continue'}</button>`;
    m.el.querySelector('#nsf [data-close]').onclick = () => m.close();
    m.el.querySelectorAll('[data-chip]').forEach((b) => (b.onclick = () => { m.el.querySelector('#desc').value = b.dataset.chip; }));
    m.el.querySelectorAll('[data-day]').forEach((b) => (b.onclick = () => { const d = b.dataset.day; data.days = data.days.includes(d) ? data.days.filter((x) => x !== d) : [...data.days, d]; draw(); }));
    m.el.querySelectorAll('.switch').forEach((s) => (s.onclick = () => s.setAttribute('aria-checked', s.getAttribute('aria-checked') !== 'true')));
    m.el.querySelector('#try')?.addEventListener('click', async () => { const o = m.el.querySelector('#tryOut'); o.innerHTML = '<div class="row small"><span class="spinner"></span> Running…</div>'; await sleep(1000); o.innerHTML = `<div class="card pad small">2 papers deferred this week: National Housing Programme – Phase 2 (conflict with the Covenant of Hope) and Land Administration (awaiting costings).</div>`; });
    m.el.querySelector('#back')?.addEventListener('click', () => { step--; draw(); });
    m.el.querySelector('#nx').onclick = async () => {
      if (step === 1) data.desc = m.el.querySelector('#desc').value.trim();
      if (step === 2) data.name = m.el.querySelector('#sname').value.trim() || data.name;
      if (step === 3) {
        data.time = m.el.querySelector('#time').value; data.repeat = m.el.querySelector('#rep').value;
        const s = await api.create('skills', { name: data.name, schedule: `${data.days.join(', ')}, ${data.time}`, description: data.desc, on: true, suggested: false, order: 50 });
        m.close(); rerender();
        return toast(`Skill saved. First run ${data.days[0] || 'Fri'} at ${data.time}`, 'Undo', async () => { await api.remove('skills', s._id); rerender(); });
      }
      step++; draw();
    };
  };
  draw();
}

async function how() {
  const u = state.user;
  const learned = (await api.list('learned')).filter((l) => !l.forgotten);
  const group = (g, t) => `<div class="stack" style="--gap:10px"><h4>${t}</h4><div class="list">${learned.filter((l) => l.group === g).map((l) => `<div class="list-row"><div class="grow"><b>${esc(l.fact)}</b><div class="small muted">${esc(l.source)}</div></div>${l.confirm ? `<button class="btn secondary sm" data-yes="${l._id}">Yes</button>` : ''}<button class="icon-btn" data-forget="${l._id}" aria-label="Forget" title="Forget">${icon('close', 's16')}</button></div>`).join('')}</div></div>`;
  return {
    title: 'How you work',
    html: `<div class="page"><div class="page-narrow stack" style="--gap:24px;max-width:800px">
      <nav class="breadcrumb"><a href="#/skills">Skills</a>${icon('right', 's16')}<span>How you work</span></nav>
      <div><h1>How you work</h1><p class="muted">What ${esc(u.agentName)} has learned about you. Remove anything that’s wrong.</p></div>
      ${u.keepLearning ? '' : `<div class="alert"><span class="alert-icon">${icon('info')}</span><div class="grow">Learning is off. ${esc(u.agentName)} keeps what it knows but won’t add more.</div><button class="btn tertiary sm" id="notNow">Not now</button><button class="btn secondary sm" id="turnOn">Turn on</button></div>`}
      ${group('decide', 'How you decide')}${group('rhythm', 'Your rhythm')}
      <div class="card pad row"><div class="grow"><b>Keep learning</b><div class="small muted">Learn from your chats, papers and activity</div></div>${sw(u.keepLearning, 'id="keep" aria-label="Keep learning"')}</div>
    </div></div>`,
    mount(root) {
      root.querySelectorAll('[data-forget]').forEach((b) => (b.onclick = async () => { const idv = b.dataset.forget; await api.update('learned', idv, { forgotten: true }); rerender(); toast('Forgotten', 'Undo', async () => { await api.update('learned', idv, { forgotten: false }); rerender(); }); }));
      root.querySelectorAll('[data-yes]').forEach((b) => (b.onclick = async () => { await api.update('learned', b.dataset.yes, { confirm: false, source: 'You confirmed' }); rerender(); }));
      const setKeep = async (v) => { await api.update('users', 'u-pm', { keepLearning: v }); await refreshUser(); rerender(); };
      root.querySelector('#keep').onclick = () => setKeep(!u.keepLearning);
      root.querySelector('#turnOn')?.addEventListener('click', () => setKeep(true));
      root.querySelector('#notNow')?.addEventListener('click', (e) => e.currentTarget.closest('.alert').remove());
    },
  };
}

async function settings() {
  const u = await refreshUser();
  return {
    title: 'Settings',
    html: `<div class="page"><div class="page-narrow stack" style="--gap:24px;max-width:720px">
      <h1>Settings</h1>
      <div class="card pad row" style="gap:16px"><span class="avatar" style="width:56px;height:56px;font-size:20px;background:var(--secondary);color:#fff">${esc(u.initials)}</span><div class="grow"><b>${esc(u.name)}</b><div class="small muted">${esc(u.office)}</div></div></div>
      <div class="stack" style="--gap:12px"><h4>Account</h4>
        <div class="field"><label>Email</label><input class="input" value="${esc(u.email)}" readonly></div>
        <div class="field"><label>Wallet</label><input class="input" value="${esc(u.wallet)}" readonly></div>
        <button class="btn secondary sm" style="align-self:flex-start" id="pw">Change password</button></div>
      <div class="stack" style="--gap:12px"><h4>Usage</h4><div class="card pad stack" style="--gap:14px">${u.usage.map((x) => `<div class="stack" style="--gap:6px"><div class="row"><span class="grow small">${esc(x.label)}</span><span class="small muted">${esc(x.display)}</span></div><div class="progress"><span style="width:${Math.max(1, (x.used / x.limit) * 100)}%"></span></div></div>`).join('')}</div></div>
      <div class="stack" style="--gap:12px"><h4>Preferences</h4><div class="list">
        <div class="list-row"><span class="grow">Language</span><select class="select" id="lang" style="width:180px">${['English', 'Français', 'Español'].map((l) => `<option ${l === u.language ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="list-row"><span class="grow">Notifications</span>${sw(u.notifications, 'id="notif" aria-label="Notifications"')}</div>
        <div class="list-row"><span class="grow">Dark mode</span>${sw(state.theme === 'dark', 'id="dark" aria-label="Dark mode"')}</div></div></div>
      <div class="row"><button class="btn tertiary" id="report">Report an issue</button><span class="spacer"></span><button class="btn tertiary" id="reset">Reset prototype data</button><button class="btn danger" id="out">Sign out</button></div>
    </div></div>`,
    mount(root) {
      root.querySelector('#lang').onchange = async (e) => { await api.update('users', 'u-pm', { language: e.target.value }); toast('Language saved'); };
      root.querySelector('#notif').onclick = async (e) => { const v = e.currentTarget.getAttribute('aria-checked') !== 'true'; e.currentTarget.setAttribute('aria-checked', v); await api.update('users', 'u-pm', { notifications: v }); };
      root.querySelector('#dark').onclick = () => { setTheme(state.theme === 'dark' ? 'light' : 'dark'); rerender(); };
      root.querySelector('#pw').onclick = () => { const m = modal({ title: 'Change password', iconName: 'lock', body: '<div class="stack"><div class="field"><label>Current password</label><input class="input" type="password"></div><div class="field"><label>New password</label><input class="input" type="password"></div></div>', foot: '<button class="btn tertiary" data-close>Cancel</button><button class="btn primary" id="ok">Update</button>' }); m.el.querySelector('#ok').onclick = () => { m.close(); toast('Password updated (prototype)'); }; };
      root.querySelector('#report').onclick = () => { const m = modal({ title: 'Report an issue', iconName: 'warning', body: '<textarea class="textarea" style="min-height:120px" placeholder="What happened?"></textarea>', foot: '<button class="btn tertiary" data-close>Cancel</button><button class="btn primary" id="ok">Send</button>' }); m.el.querySelector('#ok').onclick = () => { m.close(); toast('Thanks. Your report was sent.'); }; };
      root.querySelector('#reset').onclick = async () => { await api.reset(); sessionStorage.clear(); toast('Prototype data reset'); location.hash = '#/login'; location.reload(); };
      root.querySelector('#out').onclick = () => signOut();
    },
  };
}
