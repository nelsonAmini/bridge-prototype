import { api } from './api.js';
import { icon, esc, orb, wordmark, closePopovers, toast } from './ui.js';
import * as login from './views/login.js';
import * as onboarding from './views/onboarding.js';
import * as research from './views/research.js';
import * as directory from './views/directory.js';
import * as create from './views/create.js';
import * as editor from './views/editor.js';
import * as reviews from './views/reviews.js';
import * as skills from './views/skills.js';
import { openSearch, closeSearch } from './views/search.js';

// ---------------------------------------------------------------- app state
export const state = {
  user: null,
  // Figma: Login is drawn in Light mode, every app page in Dark mode. Until the user picks a theme, follow that.
  theme: (() => { try { return localStorage.getItem('bridge-theme'); } catch { return null; } })() || 'auto',
  collapsed: false,
  activityOpen: false,
};

export function setTheme(t) {
  state.theme = t;
  try { localStorage.setItem('bridge-theme', t); } catch {}
  applyTheme();
}
export function applyTheme() {
  const t = state.theme === 'auto' ? (location.hash.startsWith('#/login') || !location.hash ? 'light' : 'dark') : state.theme;
  document.documentElement.dataset.theme = t;
  state.resolvedTheme = t;
}
applyTheme();
window.addEventListener('hashchange', applyTheme);
// Narrow windows: the sidebar collapses to its icon rail first (see css "Layout config").
let wasNarrow = innerWidth < 1100;
window.addEventListener('resize', () => { const n = innerWidth < 1100; if (n !== wasNarrow) { wasNarrow = n; document.querySelector('.shell')?.classList.toggle('collapsed', n || state.collapsed); } });

export const isAuthed = () => sessionStorage.getItem('bridge-auth') === '1';
export function signIn() { sessionStorage.setItem('bridge-auth', '1'); }
export function signOut() { sessionStorage.removeItem('bridge-auth'); location.hash = '#/login'; }
export const go = (hash) => { location.hash = hash; };

export async function refreshUser() {
  state.user = await api.get('users', 'u-pm');
  return state.user;
}

// ---------------------------------------------------------------- routes
// Each route: [pattern, module, options]. Options: shell (sidebar), nav, sub
const routes = [
  ['login', login, { shell: false }],
  ['onboarding/:step', onboarding, { shell: false }],
  ['research', research, { nav: 'research' }],
  ['research/brief', research, { nav: 'briefing' }],
  ['research/thread/:id', research, { nav: 'research' }],
  ['directory', directory, { nav: 'directory', sub: 'all' }],
  ['directory/:view', directory, { nav: 'directory' }],
  ['create', create, { nav: 'create', sub: 'templates' }],
  ['create/:view', create, { nav: 'create' }],
  ['create/doc/:id', editor, { nav: 'create', sub: 'my', full: true }],
  ['reviews', reviews, { nav: 'reviews' }],
  ['reviews/folder/:id', reviews, { nav: 'reviews' }],
  ['reviews/tag/:tag', reviews, { nav: 'reviews' }],
  ['reviews/paper/:id', reviews, { nav: 'reviews', full: true }],
  ['skills', skills, { nav: 'skills' }],
  ['skills/how', skills, { nav: 'skills' }],
  ['settings', skills, { nav: 'settings' }],
];

function match(path) {
  const parts = path.split('/').filter(Boolean);
  for (const [pattern, mod, opts] of routes) {
    const pp = pattern.split('/');
    if (pp.length !== parts.length) continue;
    const params = {};
    let ok = true;
    pp.forEach((p, i) => {
      if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(parts[i]);
      else if (p !== parts[i]) ok = false;
    });
    if (ok) return { mod, opts, params, pattern };
  }
  return null;
}

// ---------------------------------------------------------------- shell
async function sidebar(route) {
  const nav = route.opts.nav;
  const sub = route.params.view || route.opts.sub || '';
  const [recent, revs, folders, docs] = await Promise.all([
    api.list('recent'), api.list('reviews'), api.list('reviewFolders'), api.list('documents'),
  ]);
  const toSign = revs.filter((r) => r.status === 'To sign').length;
  const item = (key, href, ic, label, extra = '') =>
    `<a class="nav-item ${nav === key && !(key === 'research' && location.hash.includes('/thread/')) ? 'active' : ''}" href="${href}" title="${label}">${icon(ic, 's16')}<span>${label}</span>${extra}</a>`;
  const subItem = (active, href, ic, label, count) =>
    `<a class="nav-item ${active ? 'active' : ''}" href="${href}">${icon(ic, 's16')}<span>${esc(label)}</span>${count != null ? `<span class="count">${count}</span>` : ''}</a>`;

  let subnav = '';
  if (nav === 'create') {
    const mine = docs.filter((d) => d.section === 'mine').length;
    const shared = docs.filter((d) => d.section === 'shared').length;
    subnav = `<div class="subnav">
      ${subItem(sub === 'templates' || sub === 'all-templates', '#/create', 'library', 'Templates')}
      ${subItem(sub === 'my', '#/create/my', 'folder', 'My documents', mine)}
      ${subItem(sub === 'shared', '#/create/shared', 'people', 'Shared with me', shared)}
      ${subItem(sub === 'pinned', '#/create/pinned', 'bookmark', 'Pinned')}</div>`;
  }
  if (nav === 'directory') {
    subnav = `<div class="subnav">
      ${subItem(sub === 'my', '#/directory/my', 'folder', 'My Papers', 23)}
      ${subItem(sub === 'ministry', '#/directory/ministry', 'bank', 'By Ministry')}
      ${subItem(sub === 'all', '#/directory', 'doc', 'All Papers', '4,812')}
      <div class="subnav-label">ADMIN</div>
      ${subItem(sub === 'kb', '#/directory/kb', 'doc', 'KB submissions', 3)}
      ${subItem(sub === 'dates', '#/directory/dates', 'history', 'Cabinet dates')}</div>`;
  }
  if (nav === 'reviews') {
    const cur = route.params.id || (route.params.tag ? 'tag:' + route.params.tag : 'rf-29oct');
    const curFolder = route.pattern === 'reviews/paper/:id' ? (revs.find((r) => r._id === route.params.id) || {}).folderId : cur;
    const tagCount = (t) => t === 'Due soon' ? revs.filter((r) => r.dueSoon && r.status !== 'Signed').length : revs.filter((r) => r.status === t).length;
    subnav = `<div class="subnav"><div class="subnav-label">FOLDERS</div>
      ${folders.map((f) => subItem(curFolder === f._id, '#/reviews/folder/' + f._id, 'folder', f.name, f._id === 'rf-29oct' ? revs.filter((r) => r.folderId === f._id).length : null)).join('')}
      ${subItem(false, '#/reviews/folder/rf-29oct', 'people', 'Shared with me', 1)}
      <div class="subnav-label">TAGS</div>
      ${['To sign', 'To read', 'Due soon'].map((t) => subItem(cur === 'tag:' + t, '#/reviews/tag/' + encodeURIComponent(t), 'label', t, tagCount(t))).join('')}</div>`;
  }
  const u = state.user;
  const curRecent = location.hash;
  return `<nav class="sidebar am-dark" aria-label="Main">
    <div class="brand-row">${wordmark()}<button class="collapse-btn" data-action="collapse" aria-label="${state.collapsed ? 'Expand' : 'Collapse'} sidebar">${icon('dock', 's16')}<span class="cl-label">${state.collapsed ? 'Expand' : 'Collapse'}</span></button></div>
    <a class="nav-item" href="#" data-action="search" title="Search (⌘K)">${icon('search', 's16')}<span>Search</span><span class="count kbd-count">⌘K</span></a>
    ${item('research', '#/research', 'chat_bubble_outline', 'Research')}
    ${item('briefing', '#/research/brief', 'sun', 'Briefing')}
    ${item('create', '#/create', 'edit', 'Create')}
    ${nav === 'create' ? subnav : ''}
    ${item('directory', '#/directory', 'folder', 'Directory')}
    ${nav === 'directory' ? subnav : ''}
    ${item('reviews', '#/reviews', 'doc', 'My Reviews', `<span class="count">${toSign}</span>`)}
    ${nav === 'reviews' ? subnav : ''}
    ${item('library', '#/library', 'library', 'Library')}
    ${item('skills', '#/skills', 'sparkle', 'Skills')}
    <div class="recent"><button class="recent-title" data-action="recent" aria-expanded="${!state.recentClosed}">Recent ${icon(state.recentClosed ? 'up' : 'down', 's16')}</button>
      ${state.recentClosed || nav === 'reviews' ? '' : recent.map((r) => { const on = curRecent === r.route && r.route.includes('thread'); return `<a class="${on ? 'active' : ''}" href="${r.route}">${icon('article', 's10')}<span>${esc(r.title)}</span>${on ? `<span class="recent-acts"><button type="button" class="chip-btn" data-action="newchat" aria-label="New chat">${icon('add', 's16')}</button><button type="button" class="chip-btn" data-action="recentmore" aria-label="More">${icon('more_vert', 's16')}</button></span>` : ''}</a>`; }).join('')}</div>
    <div class="sidebar-bottom">
      <button class="agent-card" data-action="activity" aria-label="What ${esc(u?.agentName || 'Bridge')} is doing">${orb('md', u?.agentLook)}<span class="grow"><b>${esc(u?.agentName || 'Bridge')}</b><br><span class="sub">Working · 1 needs you</span></span><span class="dot"></span></button>
      <a class="profile" href="#/settings"><span class="avatar">${esc(u?.initials)}</span><span class="grow"><b>${esc(u?.name)}</b><br><span class="sub">${esc(u?.office)}</span></span>${icon('settings', 's16')}</a>
    </div></nav>`;
}

// ---------------------------------------------------------------- activity panel (from the Bridge card)
async function toggleActivity(force) {
  state.activityOpen = force ?? !state.activityOpen;
  document.querySelector('.activity-panel')?.remove();
  if (!state.activityOpen) return;
  const a = (await api.list('activity'))[0];
  const el = document.createElement('section');
  el.className = 'activity-panel';
  el.setAttribute('aria-label', 'What Bridge is doing');
  el.innerHTML = `
    <div class="row">${orb('', state.user?.agentLook)}<div class="grow"><b>${esc(state.user?.agentName)}</b><div class="small muted">${a.paused ? 'Paused' : 'Working since ' + a.since}</div></div>
      <button class="btn tertiary sm" data-act="pause">${a.paused ? 'Resume' : 'Pause'}</button><button class="icon-btn" data-act="close" aria-label="Close">${icon('close')}</button></div>
    ${a.needsYou.length ? `<div class="small muted">Needs you</div>` : ''}
    ${a.needsYou.map((n) => `<div class="card pad stack" style="--gap:8px;background:var(--grey);border:0"><b>${esc(n.title)}</b><p class="muted">${esc(n.body)}</p>
      <div class="row"><button class="btn primary sm" data-act="review" data-id="${n.id}">Review</button><button class="btn tertiary sm" data-act="later" data-id="${n.id}">Later</button></div></div>`).join('')}
    <div class="small muted">Working on</div>
    <div class="list">${a.working.map((w) => `<div class="stack" style="--gap:6px;padding:12px 14px"><div class="row"><span class="grow">${esc(w.title)}</span><span class="small muted">${w.done} of ${w.total}</span></div><div class="progress"><span style="width:${(w.done / w.total) * 100}%"></span></div></div>`).join('')}</div>
    <div class="small muted">Scheduled</div>
    <div class="list">${a.scheduled.map((s) => `<div class="list-row"><span class="grow">${esc(s.title)}</span><span class="small muted">${esc(s.when)}</span></div>`).join('')}</div>
    <a class="btn tertiary sm" style="align-self:flex-start" href="#/skills">Manage skills</a>`;
  el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (b?.dataset.act === 'close') return toggleActivity(false);
    if (b?.dataset.act === 'pause') { await api.update('activity', 'act', { paused: !a.paused }); return toggleActivity(true); }
    if (b?.dataset.act === 'later' || b?.dataset.act === 'review') {
      await api.update('activity', 'act', { needsYou: a.needsYou.filter((n) => n.id !== b.dataset.id) });
      if (b.dataset.act === 'review') { toggleActivity(false); go('#/research/thread/th-land'); } else toggleActivity(true);
    }
    if (e.target.closest('a')) toggleActivity(false);
  });
  document.body.appendChild(el);
}

// ---------------------------------------------------------------- render loop
const app = document.getElementById('app');
let renderId = 0;

export async function render() {
  applyTheme();
  const id = ++renderId;
  closePopovers();
  closeSearch();
  document.getElementById('overlay-root').innerHTML = '';
  const path = location.hash.replace(/^#\/?/, '');
  if (!isAuthed() && !path.startsWith('login')) return go('#/login');
  if (!path) return go(isAuthed() ? '#/research' : '#/login');
  if (path === 'library') { go('#/research'); return; }
  if (!state.user) await refreshUser();
  const route = match(path);
  if (!route) return go('#/research');

  const view = await route.mod.render(route.params, { route, state });
  if (id !== renderId) return; // a newer navigation started
  const shell = route.opts.shell !== false;
  if (shell) {
    app.innerHTML = `<div class="shell ${state.collapsed || innerWidth < 1100 ? 'collapsed' : ''}">${await sidebar(route)}<main class="main" id="main">${view.html}</main></div>`;
    app.querySelector('.sidebar').addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (b?.dataset.action === 'activity') { e.preventDefault(); toggleActivity(); }
      if (b?.dataset.action === 'search') { e.preventDefault(); openSearch(); }
      if (b?.dataset.action === 'collapse') { e.preventDefault(); state.collapsed = !state.collapsed; render(); }
      if (b?.dataset.action === 'recent') { e.preventDefault(); state.recentClosed = !state.recentClosed; render(); }
      if (b?.dataset.action === 'newchat') { e.preventDefault(); go('#/research'); }
      if (b?.dataset.action === 'recentmore') { e.preventDefault(); toast('Rename, pin or delete this chat (prototype)'); }
    });
    view.mount && view.mount(app.querySelector('#main'));
  } else {
    app.innerHTML = view.html;
    view.mount && view.mount(app);
  }
  if (state.activityOpen) toggleActivity(true);
  document.title = 'Bridge · ' + (view.title || 'Prototype');
}

window.addEventListener('hashchange', render);
render();

// ⌘K / Ctrl+K opens Search from anywhere in the app (not on sign-in or setup)
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && isAuthed() && !/^#\/(login|onboarding)/.test(location.hash)) { e.preventDefault(); openSearch(); }
});

// Expose a reset helper for testers: run bridgeReset() in the console
window.bridgeReset = async () => { await api.reset(); state.user = null; render(); };
