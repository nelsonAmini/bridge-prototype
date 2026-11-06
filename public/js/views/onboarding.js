import { api } from '../api.js';
import { icon, orb, esc, sleep } from '../ui.js';
import { go, refreshUser, render as rerender } from '../app.js';

const STEPS = [
  ['Meet your agent', 'Name it and pick a look'],
  ['Topics', 'What Bridge should follow'],
  ['Priorities', 'Where it should help first'],
  ['Answers', 'How it replies to you'],
  ['Skills', 'What it starts doing'],
];
const LOOKS = ['Gold', 'Coral', 'Violet', 'Ocean'];
const PICKS = ['Papers to sign', 'Prepare for Cabinet', 'Check a paper', 'Dictate a letter', 'Daily brief'];

export async function render({ step }) {
  const n = Number(step) || 1;
  const u = await refreshUser();
  const done = n > 5;
  const side = `<aside class="onb-side">
    <div class="wordmark" style="color:#fff">${orb('sm', u.agentLook)}<span>Set up your agent</span></div>
    <div class="small" style="color:#b5b5b5">${done ? 'All done · 5 of 5' : `About 2 minutes · Step ${n} of 5`}</div>
    ${STEPS.map(([t, s], i) => `<div class="onb-step ${i + 1 === n ? 'current' : i + 1 < n ? 'done' : ''}"><span class="num">${i + 1 < n ? '✓' : i + 1}</span><div><b>${t}</b><div class="small" style="color:#b5b5b5">${s}</div></div></div>`).join('')}
    <div class="spacer"></div>
    <p class="small" style="color:#b5b5b5">Everything here can be changed later in Settings. Bridge never signs, sends or decides for you.</p>
  </aside>`;

  let content = '';
  if (n === 1) content = `
    <h2>Hello, ${esc(u.firstName)}</h2><p class="muted">This is your agent. It works in the background and keeps your day in order. You’re always in charge.</p>
    <div class="field" style="max-width:360px"><label for="name">Give your agent a name</label><input class="input" id="name" value="${esc(u.agentName)}" /><span class="help">You can rename it anytime in Settings</span></div>
    <div class="stack" style="--gap:8px"><span class="label">Pick a look</span><div class="looks">${LOOKS.map((l) => `<button class="look ${u.agentLook === l ? 'selected' : ''}" data-look="${l}">${orb('lg', l)}<span>${l}</span></button>`).join('')}</div></div>`;
  if (n === 2) {
    const topics = await api.list('topics');
    content = `<h2>What topics matter to you, ${esc(u.firstName)}?</h2><p class="muted">Pick the areas Bridge should follow. You can choose as many as you like.</p>
      <div class="option-grid">${topics.map((t) => `<button class="option ${u.topics.includes(t.name) ? 'selected' : ''}" data-topic="${esc(t.name)}"><b>${esc(t.name)}</b><span class="small muted">${esc(t.description)}</span></button>`).join('')}</div>`;
  }
  if (n === 3) content = `<h2>What should Bridge help with first?</h2><p class="muted">Talk or type about your week, or start with a few quick picks.</p>
    <div class="askbar"><textarea id="prio" placeholder="e.g. “I have three cabinet papers to sign before Thursday…”">${esc(u.priorities)}</textarea>
      <div class="tools">${icon('web', 's16')}<span class="small">Web search</span>${icon('tune', 's16')}<span class="small">Tools</span><span class="spacer"></span>${icon('attach', 's16')}<span class="small">Add attachment</span><button class="icon-btn outline" aria-label="Dictate">${icon('mic')}</button></div></div>
    <div class="stack" style="--gap:8px"><span class="label">Quick picks</span><div class="row wrap">${PICKS.map((p) => `<button class="chip lg" data-pick="${p}">${p}</button>`).join('')}</div></div>`;
  if (n === 4) content = `<h2>How do you like your answers?</h2><p class="muted">Bridge will shape every reply this way. You can change it anytime.</p>
    <div class="option-grid">
      <button class="option ${u.answerStyle === 'summary' ? 'selected' : ''}" data-style="summary"><b>Summary first</b><span class="small muted">Then the full detail and sources</span></button>
      <button class="option ${u.answerStyle === 'short' ? 'selected' : ''}" data-style="short"><b>Short and to the point</b><span class="small muted">A few lines, detail on request</span></button></div>
    <div class="stack" style="--gap:8px"><span class="label">Delivery</span><div class="row"><button class="switch" role="switch" aria-checked="${u.readAloud}" id="aloud" aria-label="Read answers aloud"></button><span>Read answers aloud</span></div></div>`;
  if (n === 5) {
    const sk = (await api.list('skills')).filter((s) => !s.suggested);
    content = `<h2>${esc(u.agentName)} will start with these skills</h2><p class="muted">Switch off anything you don’t need. Change them anytime in Skills.</p>
      <div class="list">${sk.map((s) => `<div class="list-row"><div class="grow"><b>${esc(s.name)}</b><div class="small muted">${esc(s.description || s.schedule)}</div></div><button class="btn tertiary sm">Configure</button><button class="switch" role="switch" aria-checked="${s.on}" data-skill="${s._id}" aria-label="${esc(s.name)}"></button></div>`).join('')}</div>`;
  }
  if (done) content = `<div class="stack" style="align-items:center;text-align:center;margin:auto;--gap:20px">${orb('xl thinking', u.agentLook)}
    <h2>All set, ${esc(u.firstName)}</h2><p class="muted">${esc(u.agentName)} is getting to work. Your first briefing will be ready in about a minute.</p>
    <div class="list" style="width:360px;text-align:left" id="prog">${['Reading your papers', 'Finding papers to sign', 'Checking past decisions', 'Preparing your first briefing'].map((t) => `<div class="list-row"><span class="spinner"></span><span>${t}</span></div>`).join('')}</div>
    <a class="btn primary" href="#/research">Go to Research</a></div>`;

  return {
    title: 'Set up your agent',
    html: `<div class="onb">${side}<main class="onb-main"><div class="content">${content}</div>
      ${done ? '' : `<div class="row">${n > 1 ? `<a class="btn tertiary" href="#/onboarding/${n - 1}">Back</a>` : ''}<span class="spacer"></span><button class="btn ghost" id="skip">Skip for now</button><button class="btn primary" id="next">${n === 5 ? 'Finish' : 'Continue'}</button></div>`}</main></div>`,
    async mount(root) {
      const save = (f) => api.update('users', 'u-pm', f).then(refreshUser);
      root.querySelectorAll('[data-look]').forEach((b) => (b.onclick = async () => { await save({ agentName: root.querySelector('#name').value.trim() || 'Bridge', agentLook: b.dataset.look }); rerender(); }));
      root.querySelectorAll('[data-topic]').forEach((b) => (b.onclick = () => b.classList.toggle('selected')));
      root.querySelectorAll('[data-style]').forEach((b) => (b.onclick = () => { root.querySelectorAll('[data-style]').forEach((x) => x.classList.remove('selected')); b.classList.add('selected'); }));
      root.querySelectorAll('[data-pick]').forEach((b) => (b.onclick = () => { const t = root.querySelector('#prio'); t.value = (t.value ? t.value + ' ' : '') + b.dataset.pick + '.'; }));
      root.querySelectorAll('.switch').forEach((s) => (s.onclick = () => s.setAttribute('aria-checked', s.getAttribute('aria-checked') !== 'true')));
      root.querySelector('#skip')?.addEventListener('click', async () => { await save({ onboarded: true }); go('#/research'); });
      root.querySelector('#next')?.addEventListener('click', async () => {
        if (n === 1) await save({ agentName: root.querySelector('#name').value.trim() || 'Bridge' });
        if (n === 2) await save({ topics: [...root.querySelectorAll('[data-topic].selected')].map((b) => b.dataset.topic) });
        if (n === 3) await save({ priorities: root.querySelector('#prio').value });
        if (n === 4) await save({ answerStyle: root.querySelector('[data-style].selected')?.dataset.style || 'summary', readAloud: root.querySelector('#aloud').getAttribute('aria-checked') === 'true' });
        if (n === 5) { for (const s of root.querySelectorAll('[data-skill]')) await api.update('skills', s.dataset.skill, { on: s.getAttribute('aria-checked') === 'true' }); await save({ onboarded: true }); }
        go('#/onboarding/' + (n + 1));
      });
      if (done) {
        const rows = [...root.querySelectorAll('#prog .list-row')];
        for (const r of rows) { await sleep(700); if (!document.body.contains(r)) return; r.querySelector('.spinner').outerHTML = `<span style="color:var(--success)">${icon('check')}</span>`; }
      }
    },
  };
}
