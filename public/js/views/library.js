import { api } from '../api.js';
import { icon, esc, modal, toast, popover, closePopovers } from '../ui.js';
import { go, render as rerender } from '../app.js';
import { askbar } from './research.js';

// Library (Figma 13. Library): spaces that keep work on one subject together, like Projects in Claude.
// 1. Library home (LC / Library / Home) · 2. Create a library (LC / Library / New Library) · 3. Inside a library (LC / Library / Library)

let home = { q: '', sort: 'activity' };

export async function render(params, { route }) {
  if (route.pattern === 'library/new') return newLibrary();
  if (route.pattern === 'library/:id') return library(params.id);
  return libraryHome();
}

const card = (l) => `<a class="lib-card" href="#/library/${esc(l._id)}">
  <span class="lib-card-top">${icon('library', 's16')}<b>${esc(l.name)}</b></span>
  <span class="lib-card-desc">${esc(l.description || l.goal || '')}</span>
  <span class="lib-card-meta">${esc(l.updated || 'Updated just now')}</span></a>`;

async function libraryHome() {
  const all = await api.list('libraries');
  const list = () => {
    const q = home.q.toLowerCase();
    const f = all.filter((l) => !q || (l.name + ' ' + (l.description || '')).toLowerCase().includes(q));
    if (home.sort === 'name') f.sort((a, b) => a.name.localeCompare(b.name));
    return f.length ? f.map(card).join('') : `<p class="muted lib-empty">No libraries match “${esc(home.q)}”.</p>`;
  };
  return {
    title: 'Library',
    html: `<div class="lib-page">
      <div class="lib-head"><h3>Library</h3><a class="btn primary" href="#/library/new"><span class="lead">${icon('add', 's16')}</span>New library</a></div>
      <label class="lib-search">${icon('search', 's16')}<input id="libQ" type="search" placeholder="Search libraries…" aria-label="Search libraries" value="${esc(home.q)}"></label>
      <button class="lib-sort" id="libSort" data-popover-anchor><span>Sort by</span><b>${home.sort === 'name' ? 'Name' : 'Activity'}</b></button>
      <div class="lib-grid" id="libGrid">${list()}</div></div>`,
    mount(root) {
      const grid = root.querySelector('#libGrid');
      root.querySelector('#libQ').oninput = (e) => { home.q = e.target.value; grid.innerHTML = list(); };
      root.querySelector('#libSort').onclick = (e) => {
        const btn = e.currentTarget;
        const pop = popover(e.currentTarget, [['activity', 'Activity'], ['name', 'Name']].map(([k, l]) => `<button class="menu-item ${home.sort === k ? 'active' : ''}" data-v="${k}">${l}</button>`).join(''));
        pop.onclick = (ev) => { const v = ev.target.closest('[data-v]')?.dataset.v; if (!v) return; closePopovers(); home.sort = v; btn.querySelector('b').textContent = v === 'name' ? 'Name' : 'Activity'; grid.innerHTML = list(); };
      };
    },
  };
}

function newLibrary() {
  return {
    title: 'Create a library',
    html: `<div class="lib-new"><form class="lib-form" id="libForm" novalidate>
      <h3>Create a library</h3>
      <div class="lib-field"><label for="libName">What are you working on?</label><input id="libName" class="lib-input" placeholder="Name your library" autocomplete="off"></div>
      <div class="lib-field"><label for="libGoal">What are you trying to achieve?</label><textarea id="libGoal" class="lib-input area" placeholder="Describe your project, goals, subject, etc."></textarea></div>
      <p class="lib-note">Only you can see this library until you share it.</p>
      <div class="lib-actions"><a class="btn tertiary" href="#/library">Cancel</a><button class="btn primary" id="libCreate">Create library</button></div>
    </form></div>`,
    mount(root) {
      const name = root.querySelector('#libName'); name.focus();
      root.querySelector('#libForm').onsubmit = async (e) => {
        e.preventDefault();
        const n = name.value.trim();
        if (!n) { name.setAttribute('aria-invalid', 'true'); name.focus(); return toast('Give the library a name'); }
        const goal = root.querySelector('#libGoal').value.trim();
        const all = await api.list('libraries');
        all.forEach((l) => api.update('libraries', l._id, { order: (l.order ?? 0) + 1 }));
        const l = await api.create('libraries', { name: n, goal, description: goal, updated: 'Updated just now', instructions: '', chats: [], files: [], order: 0 });
        go('#/library/' + l._id);
      };
    },
  };
}

// Seed data: the Figma frame says 6 files but draws 4 cards; fileCount keeps the 6.
const filesNote = (l) => { const n = l.fileCount ?? (l.files || []).length; return n ? `${n} file${n === 1 ? '' : 's'} · ${Math.max(1, Math.round(n * 0.67))}% of library capacity used` : 'No files yet. Add papers or uploads for Bridge to use in every chat here.'; };
const fileCard = (f) => `<div class="lib-file"><b>${esc(f.name)}</b><span>${esc(f.size)}</span><span class="lib-type">${esc(f.type)}</span></div>`;

async function library(id) {
  const l = await api.get('libraries', id);
  if (!l) return { html: '<div class="page">Library not found. <a href="#/library">All libraries</a></div>' };
  const chats = l.chats || [];
  const files = l.files || [];
  return {
    title: l.name,
    html: `<div class="lib-detail">
      <div class="lib-main">
        <a class="lib-back" href="#/library">← All libraries</a>
        <div class="lib-title-row"><h3>${esc(l.name)}</h3><button class="btn tertiary sm" id="libShare">Share</button><button class="icon-btn" id="libMore" aria-label="More" data-popover-anchor>${icon('more')}</button></div>
        ${l.goal ? `<p class="lib-goal">${esc(l.goal)}</p>` : ''}
        ${askbar('Ask anything about this library')}
        <div class="lib-chats"><span class="lib-cap">Chats in this library</span>
          ${chats.length ? chats.map((c, i) => `<button class="lib-chat" data-chat="${i}"><b>${esc(c.q)}</b><span>${esc(c.when)}</span></button>`).join('') : `<p class="lib-none">No chats yet. Ask above and the chat is saved here.</p>`}</div>
      </div>
      <aside class="lib-panel" aria-label="Library settings">
        <section><div class="lib-panel-head"><h6>Instructions</h6><button class="icon-btn" id="libInstr" aria-label="${l.instructions ? 'Edit' : 'Add'} instructions">${icon('add')}</button></div>
          <p class="lib-instr">${l.instructions ? esc(l.instructions) : 'Tell Bridge how to answer in this library, for example the tone, or what to cite.'}</p></section>
        <section><div class="lib-panel-head"><h6>Files</h6><button class="icon-btn" id="libAdd" aria-label="Add files" data-popover-anchor>${icon('add')}</button></div>
          <span class="lib-cap">${filesNote(l)}</span>
          ${files.length ? `<div class="lib-files">${files.map(fileCard).join('')}</div>` : ''}</section>
      </aside></div>`,
    mount(root) {
      root.querySelectorAll('.askbar .switch').forEach((s) => (s.onclick = () => s.setAttribute('aria-checked', s.getAttribute('aria-checked') !== 'true')));
      const q = root.querySelector('#q');
      q.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); root.querySelector('#ask').requestSubmit(); } });
      const startChat = async (text) => {
        const tpl = await api.get('threads', 'th-land');
        const { _id, createdAt, updatedAt, extra, doc, name, ...rest } = tpl;
        const time = 'Today, ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const t = await api.create('threads', { ...rest, question: text, stage: 'plan', time, libraryId: id });
        return t._id;
      };
      root.querySelector('#ask').onsubmit = async (e) => {
        e.preventDefault();
        const text = q.value.trim(); if (!text) return q.focus();
        const tid = await startChat(text);
        await api.update('libraries', id, { chats: [{ q: text, when: 'Last message just now', thread: tid }, ...chats], updated: 'Updated just now' });
        go('#/research/thread/' + tid);
      };
      root.querySelectorAll('[data-chat]').forEach((b) => (b.onclick = async () => {
        const c = chats[+b.dataset.chat];
        if (c.thread && (await api.get('threads', c.thread))) return go('#/research/thread/' + c.thread);
        const tid = await startChat(c.q);
        const next = chats.slice(); next[+b.dataset.chat] = { ...c, thread: tid };
        await api.update('libraries', id, { chats: next });
        go('#/research/thread/' + tid);
      }));
      root.querySelector('#libShare').onclick = () => toast('Link copied. People you share with see the chats, instructions and files (prototype)');
      root.querySelector('#libInstr').onclick = () => {
        const m = modal({ title: 'Instructions', iconName: 'edit', body: `<p class="muted">How should Bridge answer in this library? It follows these in every chat here.</p><textarea class="textarea" id="instr" style="min-height:140px" placeholder="For example: answer as a policy adviser and cite the paper code for every claim.">${esc(l.instructions || '')}</textarea>`, foot: '<button class="btn tertiary sm" data-close>Cancel</button><button class="btn primary sm" id="instrSave">Save</button>' });
        m.el.querySelector('#instr').focus();
        m.el.querySelector('#instrSave').onclick = async () => { await api.update('libraries', id, { instructions: m.el.querySelector('#instr').value.trim(), updated: 'Updated just now' }); m.close(); rerender(); };
      };
      root.querySelector('#libAdd').onclick = (e) => {
        const pop = popover(e.currentTarget, `<button class="menu-item" data-a="upload">${icon('upload', 's16')}Upload from computer</button><button class="menu-item" data-a="dir">${icon('folder', 's16')}Add a paper from Directory</button><button class="menu-item" data-a="rev">${icon('doc', 's16')}Add a paper from My Reviews</button>`, { align: 'right' });
        pop.onclick = async (ev) => {
          const a = ev.target.closest('[data-a]')?.dataset.a; if (!a) return; closePopovers();
          const f = { upload: { name: 'Survey plan, St Philip.pdf', size: '3 pages', type: 'PDF' }, dir: { name: 'Cabinet Paper K(A) 2024-17.pdf', size: '11 pages', type: 'PDF' }, rev: { name: 'PAHO travel report.mp3', size: '6 min', type: 'MP3' } }[a];
          const fs = [...files, f];
          await api.update('libraries', id, { files: fs, fileCount: (l.fileCount ?? files.length) + 1, updated: 'Updated just now' });
          toast(`Added ${f.name} (prototype)`); rerender();
        };
      };
      root.querySelector('#libMore').onclick = (e) => {
        const pop = popover(e.currentTarget, `<button class="menu-item" data-a="rename">${icon('edit', 's16')}Rename</button><div class="menu-sep"></div><button class="menu-item danger" data-a="delete">${icon('trash', 's16')}Delete library</button>`, { align: 'right' });
        pop.onclick = async (ev) => {
          const a = ev.target.closest('[data-a]')?.dataset.a; if (!a) return; closePopovers();
          if (a === 'rename') {
            const m = modal({ title: 'Rename library', iconName: 'edit', body: `<div class="field"><label for="ln">Name</label><input class="input" id="ln" value="${esc(l.name)}"></div>`, foot: '<button class="btn tertiary sm" data-close>Cancel</button><button class="btn primary sm" id="lnSave">Save</button>' });
            m.el.querySelector('#lnSave').onclick = async () => { const v = m.el.querySelector('#ln').value.trim(); if (!v) return; await api.update('libraries', id, { name: v }); m.close(); rerender(); };
          }
          if (a === 'delete') {
            const m = modal({ title: 'Delete library?', iconName: 'trash', body: `<p class="muted">“${esc(l.name)}”, its instructions and files will be deleted. Its chats stay in Research.</p>`, foot: '<button class="btn tertiary sm" data-close>Cancel</button><button class="btn danger sm" id="del">Delete</button>' });
            m.el.querySelector('#del').onclick = async () => { await api.remove('libraries', id); m.close(); toast('Library deleted'); go('#/library'); };
          }
        };
      };
    },
  };
}
