// Small UI helpers: icons, escaping, toasts, modals, popovers.
// Icons come from the Amini Kit (exported from Figma "02. Amini Icons").
import { ICONS } from '../amini-kit/js/icons.js';

// Prototype names → Figma icon names
const ALIAS = {
  sun: 'settings_brightness', folderOpen: 'folder_open', doc: 'description', library: 'local_library', sparkle: 'smart_button',
  right: 'chevron_right', left: 'chevron_left', back: 'arrow_back', down: 'expand_more', up: 'expand_less', more: 'more_horiz', moreV: 'more_vert',
  attach: 'attachment', moon: 'bedtime', sunny: 'wb_sunny', eye: 'visibility', eyeOff: 'visibility_off', mail: 'mail_outline', bold: 'format_bold', italic: 'format_italic',
  underline: 'format_underlined', text: 'text_fields', align: 'format_align_left', list: 'format_list_numbered', addComment: 'add_comment', play: 'play_arrow',
  pause: 'pause', cloud: 'cloud_done', people: 'group', grid: 'tune', sort: 'import_export', arrowDown: 'import_export', arrowRight: 'arrow_forward', note: 'insert_comment',
  warning: 'report_problem', bank: 'account_balance', dock: 'dock_left', zoomIn: 'zoom_in', zoomOut: 'zoom_out', web: 'language', sync: 'refresh', wallet: 'account_balance',
  pin: 'push_pin', bookmark: 'bookmark_border', newFolder: 'add_folder', danger: 'privacy_tip', ok: 'check_circle', headset: 'headset', trash: 'delete_outline',
  external: 'open_in_new', copy: 'content_copy', calendar: 'calendar_today', bell: 'notifications_none', globe: 'language', link: 'link', flight: 'flight', police: 'local_police',
  article: 'article', trendUp: 'trending_up', trendDown: 'trending_down', trace: 'device_hub', export: 'outbond', regenerate: 'refresh', starOutline: 'star_border',
};

export function icon(name, cls = '') {
  const key = ICONS[name] ? name : ALIAS[name];
  const size = /\bs16\b/.test(cls) ? 'am-icon--16' : /\bs10\b/.test(cls) ? 'am-icon--10' : /\bs40\b/.test(cls) ? 'am-icon--40' : '';
  return `<svg class="i am-icon ${size} ${cls}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${ICONS[key] || ICONS.info}</svg>`;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const orb = (size = '', look = 'Gold', extra = '') => `<span class="orb ${size} ${look && look !== 'Gold' ? look.toLowerCase() : ''} ${extra}" aria-hidden="true"><i></i></span>`;

export const avatar = (p, size = '') => `<span class="avatar ${p?.tone || ''} ${size}" title="${esc(p?.name)}">${esc(p?.initials || '?')}</span>`;

// Bridge logo (exported from Figma Local Components → Bridge Logo)
export function wordmark(dark = true) {
  return `<a class="wordmark" href="#/research" aria-label="Bridge home"><img src="amini-kit/assets/${dark ? 'bridge-logo-white' : 'bridge-logo'}.svg" alt="Bridge" width="53" height="40"></a>`;
}

export function thumb(kind) {
  if (kind === 'Travel') return `<div class="thumb"><i class="h"></i><i style="width:40%"></i><div class="row" style="--gap:4px;margin:6px 0"><i class="y" style="flex:1"></i><i class="y" style="flex:1"></i><i class="y" style="flex:1"></i></div><i></i><i></i><i></i><i></i><i style="width:70%"></i></div>`;
  if (kind === 'Report') return `<div class="thumb dark-top"><div class="band"><i class="y" style="width:70%"></i><i style="width:50%;background:#fff"></i></div><i></i><i></i><i style="width:80%"></i><i></i><i style="width:60%"></i></div>`;
  if (kind === 'Memo') return `<div class="thumb"><i class="y" style="width:35%"></i><i class="h" style="width:20%"></i><i class="h" style="width:20%"></i><i></i><i></i><i></i><i style="width:70%"></i><i></i><i style="width:50%"></i></div>`;
  if (kind === 'Blank') return `<div class="thumb"></div>`;
  return `<div class="thumb"><span class="dot"></span><i class="h" style="align-self:center"></i><i style="width:50%;align-self:center"></i><i class="y" style="width:8%"></i><i class="h" style="width:45%"></i><i></i><i style="width:80%"></i><i class="h" style="width:45%"></i><i></i><i style="width:70%"></i></div>`;
}

export function toast(message, action, onAction) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button>${esc(action)}</button>` : ''}`;
  if (action) el.querySelector('button').onclick = () => { el.remove(); onAction && onAction(); };
  root.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

// Opens a modal. `body` is HTML; returns { el, close }.
export function modal({ title, iconName, body, foot, wide, onClose }) {
  const root = document.getElementById('overlay-root');
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-head">${iconName ? icon(iconName, 's24') : ''}<h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Close">${icon('close')}</button></div>
    <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); onClose && onClose(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', onKey);
  root.appendChild(bg);
  return { el: bg.querySelector('.modal'), close };
}

// A small floating menu positioned under an element
export function popover(anchor, html, { align = 'left', cls = '' } = {}) {
  closePopovers();
  const el = document.createElement('div');
  el.className = 'popover ' + cls;
  el.dataset.popover = '1';
  el.innerHTML = html;
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  el.style.top = r.bottom + window.scrollY + 6 + 'px';
  el.style.left = (align === 'right' ? r.right - el.offsetWidth : r.left) + window.scrollX + 'px';
  setTimeout(() => document.addEventListener('click', outside), 0);
  function outside(e) { if (!el.contains(e.target)) { closePopovers(); } }
  el._cleanup = () => document.removeEventListener('click', outside);
  return el;
}
export function closePopovers() {
  document.querySelectorAll('[data-popover]').forEach((p) => { p._cleanup && p._cleanup(); p.remove(); });
}

export const statusClass = (s) => ({ 'To sign': 'warning', 'To read': 'info', Signed: 'success', Deferred: 'danger' }[s] || 'neutral');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
