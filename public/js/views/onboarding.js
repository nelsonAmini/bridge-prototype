import { api } from '../api.js';
import { icon, orb, esc, sleep, wordmark } from '../ui.js';
import { go, refreshUser, render as rerender, state } from '../app.js';
import { askbar } from './research.js';

// LC / Onboarding (Figma page "01. Home (Onboarding)", frames 90:47 … 90:2622).
// Layout: setup rail (300px) + card. The form is 5 of 12 fluid columns, centred in the card.
const STEPS = [
  ['Meet your agent', 'Name it and pick a look'],
  ['Topics', 'What Bridge should follow'],
  ['Priorities', 'Where it should help first'],
  ['Answers', 'How it replies to you'],
  ['Skills', 'What it starts doing'],
];
const LOOKS = ['Gold', 'Coral', 'Violet', 'Ocean'];
const PICKS = ['Papers to sign', 'Morning briefing', 'Check against commitments', 'Drafting letters', 'Big decisions', 'Speech prep'];
const SKILLS = [
  ['Morning Briefing', 'Your day, papers and deadlines at 6:30 AM', 'calendar', 'var(--am-brand)'],
  ['Signature Tracker', 'Flags papers waiting for your signature', 's-signature', 'var(--am-badge-blue-bg)'],
  ['Alignment Check', 'Checks drafts against past commitments', 's-alignment', 'var(--am-badge-orange-bg)'],
  ['Cabinet Paper Review', 'Summarises and critiques cabinet papers', 's-review', 'var(--am-badge-purple-bg)'],
];
const emoji = (name, size = 32) => `<img src="img/emoji/${name}.svg" alt="" width="${size}" height="${size}">`;
const head = (em, title, sub) => `<div class="onb-head"><span class="onb-emoji">${emoji(em)}</span><h2>${title}</h2><p>${sub}</p></div>`;
const actions = (n, label = 'Continue') => `<div class="onb-actions ${n === 1 ? 'end' : ''}">${n > 1 ? `<a class="am-btn am-btn--tertiary" href="#/onboarding/${n - 1}">Go back</a>` : ''}<button class="am-btn am-btn--secondary" id="next">${label}</button></div>`;

export async function render({ step }) {
  const n = Number(step) || 1;
  const u = await refreshUser();
  const done = n > 5;

  const rail = `<aside class="onb-rail">
    ${wordmark(document.documentElement.dataset.theme === 'dark')}
    <div class="onb-intro"><b>Set up your agent</b><span>${done ? 'All done · 5 of 5' : `About 2 minutes · Step ${n} of 5`}</span></div>
    <ol class="onb-steps">${STEPS.map(([t, s], i) => {
      const st = i + 1 < n ? 'done' : i + 1 === n ? 'current' : '';
      return `<li class="${st}"><span class="marker">${st === 'done' ? '✓' : i + 1}</span><span class="txt"><b>${t}</b><span>${s}</span></span></li>`;
    }).join('')}</ol>
    <p class="onb-foot">Everything here can be changed later in Settings. ${esc(u.agentName)} never signs, sends or moves files for you.</p>
  </aside>`;

  let content = '';
  if (n === 1) content = `
    <div class="onb-hero">${orb('xxl', u.agentLook)}<h1>Hello, ${esc(u.firstName)}</h1><h3>Meet your agent</h3><p>It works in the background and keeps your day in order. You’re always in control.</p></div>
    <div class="onb-field"><label for="name">Give your agent a name</label><div class="onb-input"><input id="name" value="${u.agentName === 'Bridge' ? '' : esc(u.agentName)}" placeholder="Bridge"></div><span class="help">You can rename it anytime in Settings</span></div>
    <div class="onb-section"><span class="lbl">Pick a look</span><div class="onb-looks">${LOOKS.map((l) => `<button class="onb-look ${u.agentLook === l ? 'selected' : ''}" data-look="${l}" aria-pressed="${u.agentLook === l}">${orb('md', l)}<span>${l}</span></button>`).join('')}</div></div>
    ${actions(1)}`;

  if (n === 2) {
    const topics = await api.list('topics');
    const custom = u.customTopics || [];
    content = `${head('onb-topics', `What topics matter to you, ${esc(u.firstName)}?`, 'Pick the areas Bridge should follow. You can choose as many as you like.')}
      <div class="onb-topics">${topics.map((t) => { const on = u.topics.includes(t.name); return `<button class="onb-topic ${on ? 'selected' : ''}" data-topic="${esc(t.name)}" aria-pressed="${on}">
        <span class="top"><span class="tile">${emoji(t.icon.replace(/^img\/emoji\/|\.svg$/g, ''), 24)}</span><span class="check">${on ? '✓' : ''}</span></span>
        <span class="txt"><b>${esc(t.name)}</b><span>${esc(t.description)}</span></span></button>`; }).join('')}</div>
      <div class="onb-field"><label for="tagIn">Not listed? Add your own</label><div class="onb-input tags" id="tags">${custom.map((c) => `<span class="tag">${esc(c)}<button type="button" data-rmtag="${esc(c)}" aria-label="Remove ${esc(c)}">${icon('close', 's16')}</button></span>`).join('')}<input id="tagIn" aria-label="Add a topic"></div></div>
      ${actions(2)}`;
  }

  if (n === 3) {
    const picks = u.picks || PICKS.slice(0, 3);
    content = `${head('onb-priorities', 'What should Bridge help with first?', 'Talk or type about your week, or start with a few quick picks.')}
      ${askbar('e.g. “I have three cabinet papers to sign before Thursday…”', u.priorities || '')}
      <div class="onb-section"><span class="lbl">Quick picks</span><div class="onb-picks">${PICKS.map((p) => `<button class="prompt-chip ${picks.includes(p) ? 'on' : ''}" data-pick="${p}" aria-pressed="${picks.includes(p)}"><span class="plus">${picks.includes(p) ? '✓' : '+'}</span>${p}</button>`).join('')}</div></div>
      ${actions(3)}`;
  }

  if (n === 4) {
    const choice = (k, em, t, d) => `<button class="onb-choice ${u.answerStyle === k ? 'selected' : ''}" data-style="${k}" aria-pressed="${u.answerStyle === k}"><span class="top"><span class="tile">${emoji(em, 24)}</span><span class="radio"></span></span><span class="txt"><b>${t}</b><span>${d}</span></span></button>`;
    content = `${head('onb-chat', 'How do you like your answers?', 'Bridge will shape every reply this way. You can change it anytime.')}
      <div class="onb-choices">${choice('summary', 'a-summary', 'Summary first', 'Then the full detail and sources')}${choice('short', 'a-short', 'Short and to the point', 'A few lines, detail on request')}</div>
      <div class="onb-section"><span class="lbl">Delivery</span><div class="onb-rows">
        <div class="onb-row">${emoji('onb-chat')}<span class="txt"><b>Read answers aloud</b><span>Bridge speaks its replies when you use voice</span></span><button class="switch" role="switch" aria-checked="${!!u.readAloud}" id="aloud" aria-label="Read answers aloud"></button></div>
        <a class="onb-row" href="#/onboarding/4">${emoji('calendar')}<span class="txt"><b>Morning briefing</b><span>When your daily brief is ready</span></span><span class="val">Weekdays, 6:30 AM</span>${icon('right')}</a></div></div>
      ${actions(4)}`;
  }

  if (n === 5) {
    const all = await api.list('skills');
    content = `${head('onb-skills', `${esc(u.agentName)} will start with these skills`, 'Switch off anything you don’t need. Change them anytime in Skills.')}
      <div class="onb-skills">${SKILLS.map(([name, d, em, wash]) => { const s = all.find((x) => x.name === name); const on = s ? (name === 'Cabinet Paper Review' ? false : s.on) : false; return `<div class="onb-skill">
        <div class="body"><span class="wash" style="background:${wash}"></span><span class="onb-emoji">${emoji(em)}</span><b>${name}</b><span>${d}</span></div>
        <div class="foot"><button class="am-btn am-btn--tertiary am-btn--xs" type="button">Configure</button><button class="switch" role="switch" aria-checked="${on}" ${s ? `data-skill="${s._id}"` : ''} aria-label="${name}"></button></div></div>`; }).join('')}</div>
      ${actions(5, 'Finish setup')}`;
  }

  if (done) content = `
    <div class="onb-hero">${orb('xxl thinking', u.agentLook)}<h1>All set, ${esc(u.firstName)}</h1><h1 class="sub">${esc(u.agentName)} is getting to work</h1><p>Your first briefing will be ready in about a minute.</p></div>
    <div class="onb-processing"><span class="ind">${icon('refresh')}</span><ol id="prog">${['Reading your papers', 'Finding papers to sign', 'Checking past decisions', 'Preparing your first briefing'].map((t) => `<li><span class="tick"></span>${t}</li>`).join('')}</ol></div>
    <div class="onb-actions center"><a class="am-btn am-btn--secondary" href="#/research">Go to Research</a></div>`;

  return {
    title: 'Set up your agent',
    html: `<div class="onb">${rail}<main class="onb-card ${n === 1 || done ? '' : 'glow'}">
      ${done ? '' : '<button class="am-btn am-btn--tertiary am-btn--xs onb-skip" id="skip">Skip for now</button>'}
      <div class="onb-content">${content}</div></main></div>`,
    async mount(root) {
      const save = (f) => api.update('users', 'u-pm', f).then(refreshUser);
      root.querySelectorAll('[data-look]').forEach((b) => (b.onclick = async () => { await save({ agentName: root.querySelector('#name').value.trim() || 'Bridge', agentLook: b.dataset.look }); rerender(); }));
      root.querySelectorAll('[data-topic]').forEach((b) => (b.onclick = () => {
        const on = !b.classList.contains('selected'); b.classList.toggle('selected', on); b.setAttribute('aria-pressed', on); b.querySelector('.check').textContent = on ? '✓' : '';
      }));
      const tagIn = root.querySelector('#tagIn');
      if (tagIn) {
        root.querySelector('#tags').onclick = async (e) => { const r = e.target.closest('[data-rmtag]'); if (r) { await save({ customTopics: (u.customTopics || []).filter((t) => t !== r.dataset.rmtag) }); rerender(); } else tagIn.focus(); };
        tagIn.onkeydown = async (e) => { if (e.key === 'Enter' && tagIn.value.trim()) { e.preventDefault(); await save({ customTopics: [...(u.customTopics || []), tagIn.value.trim()] }); rerender(); } };
      }
      root.querySelectorAll('[data-style]').forEach((b) => (b.onclick = () => { root.querySelectorAll('[data-style]').forEach((x) => { x.classList.remove('selected'); x.setAttribute('aria-pressed', false); }); b.classList.add('selected'); b.setAttribute('aria-pressed', true); }));
      root.querySelectorAll('[data-pick]').forEach((b) => (b.onclick = () => { const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.querySelector('.plus').textContent = on ? '✓' : '+'; }));
      root.querySelectorAll('.switch').forEach((s) => (s.onclick = () => s.setAttribute('aria-checked', s.getAttribute('aria-checked') !== 'true')));
      root.querySelector('#ask')?.addEventListener('submit', (e) => e.preventDefault());
      root.querySelector('#skip')?.addEventListener('click', async () => { await save({ onboarded: true }); go('#/research'); });
      root.querySelector('#next')?.addEventListener('click', async () => {
        if (n === 1) await save({ agentName: root.querySelector('#name').value.trim() || 'Bridge' });
        if (n === 2) await save({ topics: [...root.querySelectorAll('[data-topic].selected')].map((b) => b.dataset.topic) });
        if (n === 3) await save({ priorities: root.querySelector('#q').value, picks: [...root.querySelectorAll('[data-pick].on')].map((b) => b.dataset.pick) });
        if (n === 4) await save({ answerStyle: root.querySelector('[data-style].selected')?.dataset.style || 'summary', readAloud: root.querySelector('#aloud').getAttribute('aria-checked') === 'true' });
        if (n === 5) { for (const s of root.querySelectorAll('[data-skill]')) await api.update('skills', s.dataset.skill, { on: s.getAttribute('aria-checked') === 'true' }); await save({ onboarded: true }); }
        go('#/onboarding/' + (n + 1));
      });
      if (done) {
        for (const li of root.querySelectorAll('#prog li')) { await sleep(700); if (!document.body.contains(li)) return; li.classList.add('done'); li.querySelector('.tick').textContent = '✓'; }
      }
    },
  };
}
