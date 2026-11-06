import { api } from '../api.js';
import { icon, esc, orb, thumb, modal, popover, closePopovers, toast, statusClass, sleep } from '../ui.js';
import { state, go, render as rerender } from '../app.js';

// My Reviews (Figma page 05): folders, status groups, paper view with annotation, sign dialog
const GROUPS = ['To sign', 'To read', 'Signed'];
const collapsed = new Set(['Signed']);
let groupBy = 'status';
let query = '';

export async function render(params, { route }) {
  if (route.pattern === 'reviews/paper/:id') return paper(params.id);
  return folderView(params, route);
}

async function folderView(params, route) {
  const [revs, folders] = await Promise.all([api.list('reviews'), api.list('reviewFolders')]);
  const tag = params.tag;
  const folder = tag ? null : folders.find((f) => f._id === (params.id || 'rf-29oct')) || folders[0];
  let items = tag ? revs.filter((r) => (tag === 'Due soon' ? r.dueSoon : r.status === tag)) : revs.filter((r) => r.folderId === folder._id);
  if (query) items = items.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()));
  const name = tag || folder.fullName || folder.name;

  const card = (r) => `<button class="file" data-open="${r._id}" title="${esc(r.title)}">
    <div class="top"><span class="pdf">PDF</span><span class="row" style="gap:2px">${r.favourite ? `<span style="color:var(--brand)">${icon('star', 's16')}</span>` : ''}${icon('more', 's16')}</span></div>
    <div class="preview">${thumb(r.kind)}</div>
    <div class="name">${esc(r.title)}</div>
    <div class="row" style="justify-content:center;gap:6px"><span class="status ${statusClass(r.status)}">${esc(r.status)}</span><span class="small muted">${esc(r.meta)}</span></div></button>`;

  const grouped = groupBy === 'status' && !tag;
  const body = !items.length ? `<div class="card pad muted">${query ? 'No papers match “' + esc(query) + '”.' : 'This folder is empty. Add papers or drag them here.'}</div>`
    : grouped ? GROUPS.map((g) => {
        const list = items.filter((r) => r.status === g);
        if (!list.length) return '';
        const shut = collapsed.has(g);
        return `<section class="stack" style="--gap:12px"><div class="group-head"><button data-group="${g}" aria-expanded="${!shut}">${icon(shut ? 'right' : 'down', 's16')}<b style="color:var(--text);font-size:14px">${g}</b><span>${list.length}</span></button><span class="grow" style="border-top:1px solid var(--border)"></span></div>
          ${shut ? '' : `<div class="files">${list.map(card).join('')}</div>`}</section>`;
      }).join('')
    : `<div class="files">${items.map(card).join('')}</div>`;

  return {
    title: name,
    html: `<div class="page stack" style="--gap:20px">
      <div class="row"><nav class="breadcrumb grow"><a href="#/reviews">My Reviews</a>${icon('right', 's16')}<span>${esc(name)}</span></nav>
        <span class="row small muted">${icon('cloud', 's16')} Synced</span><button class="btn tertiary sm" id="newFolder"><span class="lead">${icon('newFolder', 's16')}</span>New folder</button><button class="btn primary sm" id="add"><span class="lead">${icon('add', 's16')}</span>Add papers</button></div>
      <div><h1>${esc(name)}</h1><p class="muted">${items.length} papers${folder?.filedBy ? ' · filed by ' + esc(folder.filedBy) : ''} · ${items.filter((r) => r.status === 'To sign').length} to sign</p></div>
      ${folder?.bridgeNote ? `<div class="bridge-line">${orb('sm', state.user.agentLook)}<span>${esc(folder.bridgeNote)}</span></div>` : ''}
      <div class="row wrap"><div class="input-wrap grow" style="max-width:360px;position:relative"><input class="input" id="search" placeholder="Search this folder" value="${esc(query)}" style="padding-left:36px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%)" class="muted">${icon('search', 's16')}</span></div>
        <button class="chip">${icon('sort', 's16')} Sort: Due date</button>
        ${tag ? '' : `<button class="chip ${grouped ? 'selected' : ''}" id="groupBy">${icon('grid', 's16')} Group by: ${grouped ? 'Status' : 'None'}</button>`}
        <button class="chip">${icon('lock', 's16')} Classification</button></div>
      ${body}</div>`,
    mount(root) {
      root.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => go('#/reviews/paper/' + b.dataset.open)));
      root.querySelectorAll('[data-group]').forEach((b) => (b.onclick = () => { const g = b.dataset.group; collapsed.has(g) ? collapsed.delete(g) : collapsed.add(g); rerender(); }));
      root.querySelector('#groupBy')?.addEventListener('click', () => { groupBy = groupBy === 'status' ? 'none' : 'status'; rerender(); });
      const s = root.querySelector('#search');
      s.onkeydown = (e) => { if (e.key === 'Enter') { query = s.value.trim(); rerender(); } };
      s.onblur = () => { if (s.value.trim() !== query) { query = s.value.trim(); rerender(); } };
      root.querySelector('#newFolder').onclick = () => newFolder();
      root.querySelector('#add').onclick = () => toast('Drop PDFs here, or ask Lucille to file them (prototype)');
    },
  };
}

function newFolder() {
  const m = modal({ title: 'New folder', iconName: 'newFolder', body: `<div class="field"><label for="fname">Folder name</label><input class="input" id="fname" placeholder="e.g. Cabinet · 5 Nov"></div>`, foot: `<button class="btn tertiary" data-close>Cancel</button><button class="btn primary" id="mk">Create</button>` });
  m.el.querySelector('#fname').focus();
  m.el.querySelector('#mk').onclick = async () => {
    const n = m.el.querySelector('#fname').value.trim(); if (!n) return;
    const f = await api.create('reviewFolders', { name: n, order: 99 });
    m.close(); go('#/reviews/folder/' + f._id);
  };
}

// ---------------------------------------------------------------- paper view
async function paper(id) {
  const r = await api.get('reviews', id);
  if (!r) return { html: '<div class="page">Paper not found. <a href="#/reviews">Back</a></div>' };
  const doc = r.documentId ? await api.get('documents', r.documentId) : null;
  let showInk = true;
  const notes = r.notes || [];

  const page = () => {
    const secs = doc ? doc.sections : [{ heading: '1. Summary', body: r.bridge || 'This paper is provided for information.' }, { heading: '2. Detail', body: 'The full text of this paper is available in the Directory. This prototype shows a short extract.' }];
    return `<article class="sheet" id="sheet" style="position:relative">
      <h1>${esc(r.title)}</h1>
      ${secs.map((s) => s.style === 'meta' ? `<p class="meta">${esc(s.body)}</p>` : `${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}${s.body ? `<p>${hl(s.body)}</p>` : ''}
        ${s.bullets ? `<ul>${s.bullets.map((b, i) => `<li>${showInk && r.ink && s.id === 'dec' && i === r.ink.highlightBullet ? `<span style="background:#ffe9a8">${hl(b)}</span><div class="ink-note">${esc(r.ink.note)}</div>` : hl(b)}</li>`).join('')}</ul>` : ''}
        ${s.tail ? `<p>${hl(s.tail)}</p>` : ''}${s.table ? `<table>${s.table.map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>` : ''}`).join('')}
      ${r.voiceNote ? `<button class="voice-pin" style="top:180px;border:0;cursor:pointer" id="pin" aria-label="Voice note">${icon('mic', 's16')}</button>` : ''}
    </article>`;
  };
  // re-apply saved highlights
  const hl = (text) => {
    let out = esc(text);
    for (const n of notes) if (n.quote && text.includes(n.quote)) out = out.replace(esc(n.quote), `<mark style="background:${n.color || '#ffe9a8'}">${esc(n.quote)}</mark>`);
    return out;
  };

  const panel = () => `<div class="stack" style="--gap:16px">
      <div class="stack" style="--gap:6px"><span class="status ${statusClass(r.status)}" style="align-self:flex-start">${esc(r.status)}</span><b>${esc(r.title)}</b><span class="small muted">${esc(r.kind)}${r.code ? ' · ' + esc(r.code) : ''}${r.ministry ? ' · ' + esc(r.ministry) : ''}</span></div>
      <div class="stack" style="--gap:8px"><b class="small">Your notes</b><div id="noteSlot"></div>
        ${notes.length ? notes.map((n) => `<div class="card pad stack" style="--gap:4px">${n.quote ? `<div class="quote"><span>“${esc(n.quote)}”</span></div>` : ''}${n.text ? `<div>${esc(n.text)}</div>` : ''}<span class="small muted">${esc(n.time || 'Just now')}</span></div>`).join('') : '<p class="small muted">Select text in the paper to highlight it or add a note.</p>'}</div>
      ${r.voiceNote ? `<div class="card pad row" id="voice"><button class="play" aria-label="Play voice note">${icon('play', 's16')}</button><div class="grow"><b class="small">${esc(r.voiceNote.title)}</b><div class="small muted">${esc(r.voiceNote.meta)}</div><div class="small">${esc(r.voiceNote.transcript)}</div></div></div>` : ''}
      ${r.bridge ? `<div class="card pad stack" style="--gap:8px"><div class="bridge-line" style="margin:0">${orb('sm', state.user.agentLook)}<b class="small">${esc(state.user.agentName)} on this paper</b></div><p class="small">${esc(r.bridge)}</p>${doc ? `<a class="btn tertiary sm" style="align-self:flex-start" href="#/create/doc/${doc._id}">Open in Create</a>` : ''}</div>` : ''}
      ${r.status === 'Signed' ? `<div class="alert success"><span class="alert-icon">${icon('check')}</span><div>Signed ${esc(r.meta)}. Sent to the Cabinet Office.</div></div>`
        : `<div class="stack" style="--gap:8px"><b class="small">Your decision</b><div class="row wrap">${['Approve', 'Defer', 'Return with comments'].map((d) => `<button class="chip" data-decide="${d}">${d}</button>`).join('')}</div></div>`}
    </div>`;

  return {
    title: r.title,
    html: `<div class="paper-view">
      <section class="doc-col">
        <div class="doc-head"><a class="icon-btn" href="#/reviews/folder/${r.folderId}" aria-label="Back to folder">${icon('left')}</a>
          <div class="title"><b>${esc(r.title)}</b><span class="small muted">${esc(r.meta)}</span></div>
          <button class="icon-btn" id="dictate" aria-label="Record voice note">${icon('mic')}</button><button class="icon-btn" aria-label="Share">${icon('share')}</button><button class="icon-btn" aria-label="More">${icon('more')}</button>
          ${r.status !== 'Signed' ? `<button class="btn primary sm" id="sign">${r.status === 'To read' ? 'Mark as read' : 'Sign'}</button>` : ''}</div>
        <div class="toolbar"><button class="icon-btn" aria-label="Zoom out">${icon('zoomOut')}</button><span class="small">100%</span><button class="icon-btn" aria-label="Zoom in">${icon('zoomIn')}</button><span class="sep"></span><span class="small muted">Page 1 of ${doc ? 4 : 2}</span><span class="spacer"></span>
          ${r.ink ? `<span class="small">Show iPad ink</span><button class="switch" role="switch" aria-checked="true" id="ink" aria-label="Show iPad ink"></button>` : ''}</div>
        <div class="canvas" id="canvas">${page()}</div>
      </section>
      <aside class="panel"><div class="panel-scroll top" id="panel">${panel()}</div></aside></div>`,
    mount(root) {
      const redraw = () => { root.querySelector('#canvas').innerHTML = page(); root.querySelector('#panel').innerHTML = panel(); bind(); };
      const saveNotes = () => api.update('reviews', id, { notes });
      const bind = () => {
        root.querySelector('#pin')?.addEventListener('click', () => root.querySelector('#voice')?.scrollIntoView({ behavior: 'smooth' }));
        root.querySelector('#voice .play')?.addEventListener('click', () => toast('Playing voice note (prototype: no audio)'));
        root.querySelectorAll('[data-decide]').forEach((b) => (b.onclick = () => signDialog(r, b.dataset.decide)));
        root.querySelector('#sheet').addEventListener('mouseup', () => setTimeout(onSelect, 0));
      };
      const onSelect = () => {
        const sel = window.getSelection(); const text = sel.toString().trim();
        closePopovers();
        if (text.length < 3 || !root.querySelector('#sheet').contains(sel.anchorNode)) return;
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        const colors = ['#ffe9a8', '#c5e8cb', '#c5c8e7', '#f6c6c1'];
        const pop = popover({ getBoundingClientRect: () => rect }, `<div class="row" style="padding:6px 8px;gap:6px">${colors.map((c) => `<button data-c="${c}" aria-label="Highlight" style="width:20px;height:20px;border-radius:50%;border:1px solid var(--border);background:${c};cursor:pointer"></button>`).join('')}</div>
          <button class="menu-item" data-note>${icon('note', 's16')} Add note</button><button class="menu-item" data-ask>${orb('sm', state.user.agentLook)} Ask ${esc(state.user.agentName)}</button>`);
        pop.querySelectorAll('[data-c]').forEach((b) => (b.onclick = async () => { closePopovers(); notes.push({ quote: text, color: b.dataset.c, time: 'Just now' }); await saveNotes(); redraw(); }));
        pop.querySelector('[data-note]').onclick = () => {
          closePopovers();
          const slot = root.querySelector('#noteSlot');
          slot.innerHTML = `<div class="card pad stack" style="--gap:8px"><div class="quote"><span>“${esc(text)}”</span></div><textarea class="textarea" id="nt" placeholder="Write a note…" style="min-height:60px"></textarea><div class="row" style="justify-content:flex-end"><button class="btn tertiary sm" id="nc">Cancel</button><button class="btn primary sm" id="ns">Save note</button></div></div>`;
          slot.querySelector('#nt').focus();
          slot.querySelector('#nc').onclick = () => (slot.innerHTML = '');
          slot.querySelector('#ns').onclick = async () => { notes.push({ quote: text, text: slot.querySelector('#nt').value.trim(), color: '#ffe9a8', time: 'Just now' }); await saveNotes(); redraw(); };
        };
        pop.querySelector('[data-ask]').onclick = async () => {
          closePopovers();
          notes.push({ quote: text, text: `${state.user.agentName}: this claim is supported by the Digital ID uptake survey 2025. No conflict with earlier Cabinet decisions.`, color: '#c5c8e7', time: 'Just now' });
          await saveNotes(); redraw();
        };
      };
      root.querySelector('#ink')?.addEventListener('click', (e) => { showInk = e.currentTarget.getAttribute('aria-checked') !== 'true'; e.currentTarget.setAttribute('aria-checked', showInk); root.querySelector('#canvas').innerHTML = page(); root.querySelector('#sheet').addEventListener('mouseup', () => setTimeout(onSelect, 0)); });
      root.querySelector('#dictate').onclick = () => toast('Recording… (prototype: click again to stop)');
      root.querySelector('#sign')?.addEventListener('click', async () => {
        if (r.status === 'To read') { await api.update('reviews', id, { status: 'Signed', meta: 'Read today' }); toast('Marked as read'); return go('#/reviews/folder/' + r.folderId); }
        signDialog(r);
      });
      bind();
    },
  };
}

function signDialog(r, decision = 'Approve') {
  const m = modal({
    title: 'Sign this paper', iconName: 'edit',
    body: `<div class="stack" style="--gap:16px"><p class="muted">${esc(r.title)}</p>
      <div class="stack" style="--gap:8px"><span class="label">Decision</span><div class="row wrap" id="dec">${['Approve', 'Defer', 'Return with comments'].map((d) => `<button class="chip ${d === decision ? 'selected' : ''}" data-d="${d}">${d}</button>`).join('')}</div></div>
      <div class="field"><label>Signature</label><div class="signature-box" id="sig"><span class="muted">Click to add your saved signature</span></div></div>
      <label class="row"><input type="checkbox" id="confirm"> <span>I have read this paper and its annexes</span></label>
      <div class="bridge-line" style="margin:0">${orb('sm', state.user.agentLook)}<span class="small">${esc(state.user.agentName)} will send it to the Cabinet Office and file the signed copy here. It never signs for you.</span></div></div>`,
    foot: `<button class="btn tertiary" data-close>Cancel</button><button class="btn primary" id="send" disabled>Sign and send</button>`,
  });
  let signed = false, d = decision;
  const check = () => (m.el.querySelector('#send').disabled = !(signed && m.el.querySelector('#confirm').checked));
  m.el.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { d = b.dataset.d; m.el.querySelectorAll('[data-d]').forEach((x) => x.classList.toggle('selected', x === b)); }));
  m.el.querySelector('#sig').onclick = (e) => { signed = true; e.currentTarget.innerHTML = `<span style="font-family:'Brush Script MT',cursive;font-size:34px">J. Prime Minister</span>`; check(); };
  m.el.querySelector('#confirm').onchange = check;
  m.el.querySelector('#send').onclick = async () => {
    m.el.querySelector('#send').innerHTML = '<span class="spinner"></span> Sending…';
    await sleep(700);
    await api.update('reviews', r._id, { status: 'Signed', meta: 'Signed today', decision: d });
    m.close();
    go('#/reviews/folder/' + r.folderId);
    toast('Signed and sent to the Cabinet Office', 'View', () => go('#/reviews/paper/' + r._id));
  };
}
