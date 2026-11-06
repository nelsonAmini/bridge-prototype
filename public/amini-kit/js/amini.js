// Amini Kit · behaviour helpers (vanilla ES module, no dependencies)
// Markup and styling live in css/components.css; these helpers only add the
// small amount of JS the components need (overlays, toasts, toggles).
//
//   import { icon, toast, modal, popover, menu, initKit, setTheme } from './amini-kit/js/amini.js';
//   initKit();   // wires switches, tooltips and tabs that use data attributes

export { icon, ICONS, ICON_NAMES } from './icons.js';
import { icon } from './icons.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------- theme
/** 'light' | 'dark' | 'auto'. Saved per browser. */
export function setTheme(theme) {
  const t = theme === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('am-theme', theme); } catch {}
  return t;
}
export function getTheme() { return document.documentElement.dataset.theme || 'light'; }
export function restoreTheme(fallback = 'light') {
  let t = fallback; try { t = localStorage.getItem('am-theme') || fallback; } catch {}
  return setTheme(t);
}

// ---------------------------------------------------------------- toast
function region() {
  let r = document.querySelector('.am-toast-region');
  if (!r) { r = document.createElement('div'); r.className = 'am-toast-region'; r.setAttribute('role', 'status'); r.setAttribute('aria-live', 'polite'); document.body.appendChild(r); }
  return r;
}
/** Dark toast at the bottom of the screen. Optional action ("Undo", "View"). */
export function toast(message, { action, onAction, timeout = 4200 } = {}) {
  const el = document.createElement('div');
  el.className = 'am-toast';
  el.innerHTML = `<span>${esc(message)}</span>${action ? `<button type="button">${esc(action)}</button>` : ''}`;
  region().appendChild(el);
  const close = () => el.remove();
  el.querySelector('button')?.addEventListener('click', () => { close(); onAction?.(); });
  setTimeout(close, timeout);
  return close;
}

// ---------------------------------------------------------------- modal
/**
 * Modal Box. `body` and `foot` are HTML strings. Elements with [data-close] close it.
 * Returns { el, close }. Escape and a click on the scrim also close it.
 */
export function modal({ title = '', iconName, body = '', foot, size = '', onClose, closeOnScrim = true } = {}) {
  const scrim = document.createElement('div');
  scrim.className = 'am-scrim';
  scrim.innerHTML = `<div class="am-modal ${size ? 'am-modal--' + size : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="am-modal__head"><div class="am-modal__title">${iconName ? icon(iconName) : ''}<span>${esc(title)}</span></div>
      <button class="am-modal__close" type="button" data-close aria-label="Close">${icon('close')}</button></div>
    <div class="am-modal__body">${body}</div>
    ${foot ? `<div class="am-modal__foot">${foot}</div>` : ''}</div>`;
  document.body.appendChild(scrim);
  const prev = document.activeElement;
  const close = () => { scrim.remove(); document.removeEventListener('keydown', onKey); prev?.focus?.(); onClose?.(); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  scrim.addEventListener('click', (e) => { if (e.target.closest('[data-close]') || (closeOnScrim && e.target === scrim)) close(); });
  const first = scrim.querySelector('.am-modal__body :is(input, textarea, select, button)') || scrim.querySelector('[data-close]');
  first?.focus();
  return { el: scrim.querySelector('.am-modal'), scrim, close };
}

// ---------------------------------------------------------------- popover / menu
let openPop = null;
export function closePopovers() { openPop?.remove(); openPop = null; }
document.addEventListener('click', (e) => { if (openPop && !openPop.contains(e.target) && !e.target.closest('[data-popover-anchor]')) closePopovers(); }, true);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopovers(); });
addEventListener('resize', closePopovers);

/** Place any HTML in a floating panel next to an anchor (element or {getBoundingClientRect}). */
export function popover(anchor, html, { align = 'left', cls = 'am-dropdown', offset = 6 } = {}) {
  closePopovers();
  const el = document.createElement('div');
  el.className = cls;
  el.style.position = 'fixed';
  el.innerHTML = html;
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  let left = align === 'right' ? r.right - w : r.left;
  let top = r.bottom + offset;
  if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - offset);
  left = Math.min(Math.max(8, left), innerWidth - w - 8);
  el.style.left = left + 'px'; el.style.top = top + 'px';
  openPop = el;
  return el;
}

/**
 * Context menu. items: [{ label, icon, danger, hint, onSelect }, '-' for a separator].
 */
export function menu(anchor, items, opts = {}) {
  const html = items.map((it, i) => it === '-' ? '<div class="am-menu__sep"></div>'
    : `<button type="button" class="am-menu__item ${it.danger ? 'am-menu__item--danger' : ''}" data-i="${i}">${it.icon ? icon(it.icon, 'am-icon--16') : ''}<span>${esc(it.label)}</span>${it.hint ? `<span class="am-menu__hint">${esc(it.hint)}</span>` : ''}</button>`).join('');
  const el = popover(anchor, html, { cls: 'am-menu', align: 'right', ...opts });
  el.setAttribute('role', 'menu');
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; closePopovers(); items[+b.dataset.i].onSelect?.(); });
  el.querySelector('button')?.focus();
  return el;
}

// ---------------------------------------------------------------- tooltip
let tip = null;
function showTip(target) {
  hideTip();
  tip = document.createElement('div');
  tip.className = 'am-tooltip';
  tip.textContent = target.getAttribute('data-tooltip');
  document.body.appendChild(tip);
  const r = target.getBoundingClientRect();
  const below = r.top < 48;
  tip.dataset.pos = below ? 'bottom' : 'top';
  tip.style.left = Math.max(8, r.left + r.width / 2 - tip.offsetWidth / 2 + scrollX) + 'px';
  tip.style.top = (below ? r.bottom + 9 : r.top - tip.offsetHeight - 9) + scrollY + 'px';
}
function hideTip() { tip?.remove(); tip = null; }

// ---------------------------------------------------------------- init
/**
 * Wires declarative behaviour anywhere in the page (safe to call more than once):
 *  - <button class="am-switch" role="switch" aria-checked="false">   toggles on click
 *  - [data-tooltip="Text"]                                           shows a tooltip on hover/focus
 *  - .am-tabs[data-tabs] > .am-tab[aria-controls]                    switches panels
 * Each fires a bubbling `am:change` event with { detail: value }.
 */
let wired = false;
export function initKit() {
  if (wired) return; wired = true;
  document.addEventListener('click', (e) => {
    const sw = e.target.closest('.am-switch[role="switch"]:not([data-manual])');
    if (sw && !sw.disabled) {
      const on = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', String(on));
      sw.dispatchEvent(new CustomEvent('am:change', { bubbles: true, detail: on }));
    }
    const tab = e.target.closest('.am-tabs[data-tabs] .am-tab');
    if (tab) {
      const list = tab.closest('.am-tabs');
      list.querySelectorAll('.am-tab').forEach((t) => {
        const sel = t === tab; t.setAttribute('aria-selected', String(sel));
        const p = t.getAttribute('aria-controls'); if (p) document.getElementById(p)?.toggleAttribute('hidden', !sel);
      });
      list.dispatchEvent(new CustomEvent('am:change', { bubbles: true, detail: tab.dataset.value || tab.textContent.trim() }));
    }
  });
  document.addEventListener('mouseover', (e) => { const t = e.target.closest('[data-tooltip]'); if (t) showTip(t); });
  document.addEventListener('mouseout', (e) => { if (e.target.closest('[data-tooltip]')) hideTip(); });
  document.addEventListener('focusin', (e) => { const t = e.target.closest('[data-tooltip]'); if (t) showTip(t); });
  document.addEventListener('focusout', hideTip);
}

// ---------------------------------------------------------------- small render helpers
/** <span class="am-avatar">JD</span> from a name. size: 16|24|32|40|48|64 */
export function avatar(name = '', size = 24, cls = '') {
  const initials = name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('');
  return `<span class="am-avatar ${size !== 24 ? 'am-avatar--' + size : ''} ${cls}" title="${esc(name)}">${esc(initials)}</span>`;
}
/** Data Status. type: neutral|success|negative|warning|info. large → tinted pill. */
export function status(label, type = 'neutral', large = false) {
  return `<span class="am-status am-status--${type} ${large ? 'am-status--lg' : ''}">${esc(label)}</span>`;
}
