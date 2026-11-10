import { api } from '../api.js';
import { icon, esc, orb, toast } from '../ui.js';
import { state, go } from '../app.js';

// Search palette (Figma 07. Search → LC / Search / Palette, State=Recent | Results).
// Opens from the sidebar "Search ⌘K" item or ⌘K / Ctrl+K anywhere. Empty: what you opened recently in every
// module. Typing: "Ask Bridge" first, then results grouped Papers · My Reviews · Research · Documents · People.
const FILTERS = ['All', 'Papers', 'My Reviews', 'Research', 'Documents', 'People'];
const GROUP = { paper: 'Papers', review: 'My Reviews', folder: 'My Reviews', research: 'Research', document: 'Documents', person: 'People' };
const ICON = { paper: 'doc', review: 'doc', folder: 'folder', research: 'chat_bubble_outline', document: 'edit', person: 'people' };

let open = null;

export function isOpen() { return !!open; }

export async function openSearch() {
  if (open) return open.input.focus();
  const index = await api.list('searchIndex');
  let filter = 'All';
  let sel = 0;
  let rows = [];

  const root = document.getElementById('overlay-root');
  const bg = document.createElement('div');
  bg.className = 'search-bg';
  bg.innerHTML = `<div class="search-palette" role="dialog" aria-modal="true" aria-label="Search">
    <div class="sp-field">${icon('search')}<input id="spq" type="text" autocomplete="off" placeholder="Search papers, reviews, chats and documents" aria-label="Search papers, reviews, chats and documents" aria-controls="sp-list"><kbd class="key">esc</kbd></div>
    <div class="sp-filters" role="tablist" aria-label="Filter results">${FILTERS.map((f) => `<button type="button" role="tab" class="tab-item" data-f="${f}">${f}</button>`).join('')}</div>
    <div class="sp-list" id="sp-list" role="listbox" aria-label="Results"></div>
    <div class="sp-keys"><span><kbd class="key">↑</kbd><kbd class="key">↓</kbd>Navigate</span><span><kbd class="key">⏎</kbd>Open</span><span><kbd class="key">⌘</kbd><kbd class="key">⏎</kbd>Open in new window</span><span><kbd class="key">esc</kbd>Close</span></div></div>`;
  root.appendChild(bg);
  const input = bg.querySelector('#spq');
  const list = bg.querySelector('#sp-list');

  const row = (r, i) => {
    const on = i === sel;
    if (r.type === 'ask') return `<button type="button" class="sp-row ask ${on ? 'on' : ''}" role="option" aria-selected="${on}" data-i="${i}">${orb('', state.user?.agentLook)}<span class="txt"><b>Ask ${esc(state.user?.agentName || 'Bridge')} about “${esc(r.q)}”</b><span class="crumb">Answers from papers, Cabinet decisions and your notes</span></span><span class="meta">⏎</span></button>`;
    return `<button type="button" class="sp-row ${on ? 'on' : ''}" role="option" aria-selected="${on}" data-i="${i}">${icon(ICON[r.type])}<span class="txt"><b>${esc(r.title)}</b><span class="crumb">${esc(r.path)}</span></span><span class="meta">${esc(r.metaShown ?? r.meta)}</span></button>`;
  };

  function draw() {
    const q = input.value.trim();
    bg.querySelectorAll('[data-f]').forEach((b) => { b.classList.toggle('selected', b.dataset.f === filter); b.setAttribute('aria-selected', b.dataset.f === filter); });
    const want = (r) => filter === 'All' || GROUP[r.type] === filter;
    let html = '';
    if (!q) {
      rows = index.filter((r) => r.recent && want(r)).sort((a, b) => a.recent.idx - b.recent.idx).map((r) => ({ ...r, metaShown: r.recent.meta }));
      html = rows.length ? `<div class="sp-group">RECENT</div>${rows.map(row).join('')}` : `<div class="sp-empty">Nothing opened recently in ${esc(filter)}.</div>`;
    } else {
      const words = q.toLowerCase().split(/\s+/);
      const hit = index.filter((r) => !(r.recent && r._id.startsWith('s-r') && index.some((o) => o !== r && o.title === r.title && o.type === r.type && !o.recent)))
        .filter((r) => want(r) && words.every((w) => (r.title + ' ' + r.keywords).toLowerCase().includes(w)));
      rows = filter === 'All' || filter === 'Research' ? [{ type: 'ask', q }] : [];
      html = rows.map(row).join('');
      for (const g of FILTERS.slice(1)) {
        const list2 = hit.filter((r) => GROUP[r.type] === g);
        if (!list2.length) continue;
        html += `<div class="sp-group">${g.toUpperCase()} · ${list2.length}</div>`;
        html += list2.map((r) => { rows.push(r); return row(r, rows.length - 1); }).join('');
      }
      if (rows.length === (filter === 'All' || filter === 'Research' ? 1 : 0)) html += `<div class="sp-empty">No ${filter === 'All' ? 'results' : filter.toLowerCase()} for “${esc(q)}”. Ask ${esc(state.user?.agentName || 'Bridge')} instead.</div>`;
    }
    sel = Math.min(sel, Math.max(rows.length - 1, 0));
    list.innerHTML = html;
    list.querySelector('.sp-row.on')?.scrollIntoView({ block: 'nearest' });
  }

  function choose(i, newWindow) {
    const r = rows[i];
    if (!r) return;
    const dest = r.type === 'ask' ? 'ask' : r.route;
    if (dest === 'person') { toast(`${r.title}: profile and shared papers (prototype)`); return; }
    if (newWindow && dest !== 'ask') { window.open(location.pathname + dest, '_blank'); return close(); }
    close();
    if (dest === 'ask') { sessionStorage.setItem('bridge-ask', r.type === 'ask' ? r.q : r.title); go('#/research'); return; }
    if (r.paperId) sessionStorage.setItem('bridge-open-paper', r.paperId);
    if (r.type === 'document' && dest === '#/create/my') toast(`“${r.title}” is a sample document in this prototype`);
    if (location.hash === dest) window.dispatchEvent(new HashChangeEvent('hashchange')); else go(dest);
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); return close(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, rows.length - 1); draw(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); draw(); }
    if (e.key === 'Enter') { e.preventDefault(); choose(sel, e.metaKey || e.ctrlKey); }
  }
  function close() { bg.remove(); document.removeEventListener('keydown', onKey, true); open = null; }

  input.addEventListener('input', () => { sel = 0; draw(); });
  bg.querySelector('.sp-filters').onclick = (e) => { const f = e.target.closest('[data-f]'); if (!f) return; filter = f.dataset.f; sel = 0; draw(); input.focus(); };
  list.onclick = (e) => { const b = e.target.closest('[data-i]'); if (b) choose(+b.dataset.i, e.metaKey || e.ctrlKey); };
  list.onmousemove = (e) => { const b = e.target.closest('[data-i]'); if (b && +b.dataset.i !== sel) { sel = +b.dataset.i; list.querySelectorAll('.sp-row').forEach((x) => { const on = +x.dataset.i === sel; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); }); } };
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) close(); });
  document.addEventListener('keydown', onKey, true);
  open = { input, close };
  draw();
  input.focus();
}

export function closeSearch() { open?.close(); }
