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
  const learned = (await api.list('learned')).filter((l) => !l.forgotten).length;
  const mine = skills.filter((s) => !s.suggested), sugg = skills.filter((s) => s.suggested);
  return {
    title: 'Skills',
    html: `<div class="wide-page">
      <h3 class="page-title">Skills</h3>
      <div class="agent-head">${orb('lg', u.agentLook)}<div class="grow"><b>${esc(u.agentName)}</b><div class="small muted">Your agent · always on</div></div><button class="btn tertiary sm" id="editAgent">Edit</button></div>
      <div class="list">
        <button class="settings-row" id="instr"><span class="grow">Instructions</span><span class="val">Summary first; I decide</span>${icon('right', 's16')}</button>
        <a class="settings-row" href="#/skills/how"><span class="grow">How you work</span><span class="val">${learned} things learned</span>${icon('right', 's16')}</a>
        <button class="settings-row" id="ask"><span class="grow">When to act or ask</span><span class="val">Asks before drafting</span>${icon('right', 's16')}</button></div>
      <div class="row"><span class="grow sec">Skills</span><button class="btn primary sm" id="newSkill">New skill</button></div>
      <div class="list">${mine.map((s) => `<div class="skill-row"><div class="grow"><b>${esc(s.name)}</b><div class="sub">${esc(s.schedule)}</div></div><button class="btn tertiary sm" data-edit="${s._id}">Edit</button>${sw(s.on, `data-skill="${s._id}" aria-label="${esc(s.name)}"`)}</div>`).join('')}
        ${sugg.map((s) => `<div class="skill-row"><div class="grow"><b>${esc(s.name)}</b><div class="sub suggest">Suggested · you ask for this often</div></div><button class="btn tertiary sm" data-dismiss="${s._id}">Dismiss</button><button class="btn primary sm" data-add="${s._id}">Add</button></div>`).join('')}</div>
    </div>`,
    mount(root) {
      root.querySelectorAll('[data-skill]').forEach((b) => (b.onclick = async () => { const on = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', on); await api.update('skills', b.dataset.skill, { on }); toast(on ? 'Skill turned on' : 'Skill paused'); }));
      root.querySelectorAll('[data-add]').forEach((b) => (b.onclick = async () => { await api.update('skills', b.dataset.add, { suggested: false, on: true, schedule: 'Mon and Wed, 8:00 AM' }); toast('Skill added'); rerender(); }));
      root.querySelectorAll('[data-dismiss]').forEach((b) => (b.onclick = async () => { await api.update('skills', b.dataset.dismiss, { dismissed: true }); rerender(); }));
      root.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => newSkill(skills.find((x) => x._id === b.dataset.edit))));
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

function newSkill(existing) {
  let step = existing ? 2 : 1;
  const data = { desc: existing?.description || '', name: existing?.name || 'Friday deferred papers', days: ['Fri'], time: '4:00 PM', repeat: 'Every week' };
  const STEPS = ['Describe', 'Review', 'Schedule'];
  const m = modal({ title: existing ? 'Edit skill' : 'New skill', iconName: 'sparkle', wide: true, body: '<div id="ns"></div>', foot: '<div id="nsf" class="row" style="width:100%"></div>' });
  const draw = () => {
    const head = `<div class="steps">${STEPS.map((s, i) => `<div class="step ${i + 1 <= step ? 'active' : ''}"><span class="num">${i + 1 < step ? '✓' : '0' + (i + 1)}</span>${s}</div>`).join('<span class="step-line"></span>')}</div>`;
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
        if (existing) { await api.update('skills', existing._id, { name: data.name, schedule: `${data.days.join(', ')}, ${data.time}` }); m.close(); rerender(); return toast('Skill updated'); }
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
    html: `<div class="wide-page"><div class="stack" style="--gap:24px">
      <nav class="breadcrumb"><a href="#/skills">Skills</a>${icon('right', 's16')}<span>How you work</span></nav>
      <div><h3 class="page-title">How you work</h3><p class="muted">What ${esc(u.agentName)} has learned about you. Remove anything that’s wrong.</p></div>
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

// Account settings → Notifications: one switch per type (Figma 06, flow 5)
const NOTIFS = [['sign', 'Papers to sign', 'When a paper is filed for your signature'], ['brief', 'Daily brief ready', 'Each weekday at 6:30 AM'], ['answers', 'Answers and plans', 'When a long answer is ready or a plan needs you'], ['comments', 'Comments and mentions', 'When someone comments or Bridge suggests a change'], ['shared', 'Shared with you', 'When a paper is shared or updated']];

async function settings() {
  const u = await refreshUser();
  const notif = typeof u.notifications === 'object' && u.notifications ? u.notifications : Object.fromEntries(NOTIFS.map(([k]) => [k, u.notifications !== false]));
  return {
    title: 'Account and settings',
    html: `<div class="wide-page">
      <h3 class="page-title">Account and settings</h3>
      <div class="row profile-row"><span class="avatar dark">${esc(u.initials)}</span><div><b>${esc(u.name)}</b><div class="tiny muted">${esc(u.email)} · ${esc(u.office)}</div></div></div>
      <span class="sec">Account</span>
      <div class="row" style="--gap:16px;align-items:flex-start"><div class="field grow"><label for="em">Email</label><input class="input" id="em" value="${esc(u.email)}" readonly></div><div class="field grow"><label for="wl">Wallet</label><input class="input" id="wl" value="${esc(u.wallet)}" readonly></div></div>
      <button class="btn secondary sm" style="align-self:flex-start" id="pw">Change password</button>
      <span class="sec">Usage and quota</span>
      <div class="list set-list">${u.usage.map((x) => `<div class="usage-row"><div class="row"><span class="grow">${esc(x.label)}</span><span class="tiny muted">${esc(x.display)}</span></div><div class="progress"><span style="width:${Math.max(8, (x.used / x.limit) * 100)}%"></span></div></div>`).join('')}</div>
      <span class="sec">App</span>
      <div class="field"><label for="lang" class="set-label">Language</label><select class="select" id="lang">${['English', 'Français', 'Español'].map((l) => `<option ${l === u.language ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <p class="set-help">Default for your deployment. Changing it applies on web and mobile.</p></div>
      <span class="sec">Notifications</span>
      <div class="list set-list">${NOTIFS.map(([k, t, d]) => `<div class="notif-row"><div class="grow"><span>${t}</span><span class="tiny muted">${d}</span></div>${sw(notif[k], `data-notif="${k}" aria-label="${t}"`)}</div>`).join('')}</div>
      <p class="tiny muted">These settings apply on web and on the Bridge mobile app.</p>
      <div class="card row tog-card proto-only" style="max-width:352px"><span class="grow">Dark mode <span class="tiny muted">(prototype only)</span></span>${sw(document.documentElement.dataset.theme === 'dark', 'id="dark" aria-label="Dark mode"')}</div>
      <div class="row"><button class="btn tertiary sm" id="report">Report an issue</button><button class="btn danger sm" id="out">Sign out</button><span class="spacer"></span><button class="btn ghost sm" id="reset">Reset prototype data</button></div>
    </div>`,
    mount(root) {
      root.querySelector('#lang').onchange = async (e) => { await api.update('users', 'u-pm', { language: e.target.value }); toast('Language saved'); };
      root.querySelectorAll('[data-notif]').forEach((b) => (b.onclick = async () => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', v); notif[b.dataset.notif] = v; await api.update('users', 'u-pm', { notifications: { ...notif } }); }));
      root.querySelector('#dark').onclick = () => { setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); rerender(); };
      root.querySelector('#pw').onclick = () => { const m = modal({ title: 'Change password', iconName: 'lock', body: '<div class="stack"><div class="field"><label>Current password</label><input class="input" type="password"></div><div class="field"><label>New password</label><input class="input" type="password"></div></div>', foot: '<button class="btn tertiary sm" data-close>Cancel</button><button class="btn primary sm" id="ok">Update</button>' }); m.el.querySelector('#ok').onclick = () => { m.close(); toast('Password updated (prototype)'); }; };
      root.querySelector('#report').onclick = () => { const m = modal({ title: 'Report an issue', iconName: 'warning', body: '<textarea class="textarea" style="min-height:120px" placeholder="What happened?"></textarea>', foot: '<button class="btn tertiary sm" data-close>Cancel</button><button class="btn primary sm" id="ok">Send</button>' }); m.el.querySelector('#ok').onclick = () => { m.close(); toast('Thanks. Your report was sent.'); }; };
      root.querySelector('#reset').onclick = async () => { await api.reset(); sessionStorage.clear(); toast('Prototype data reset'); location.hash = '#/login'; location.reload(); };
      root.querySelector('#out').onclick = () => signOut();
    },
  };
}
