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
    <div class="top"><img class="pdf-ic" src="img/emoji/pdf.svg" alt="PDF" width="16" height="16"><span class="row" style="--gap:0">${r.favourite ? `<span class="star">${icon('star', 's16')}</span>` : ''}<span class="icon-btn xs" data-more="${r._id}">${icon('more', 's16')}</span></span></div>
    <div class="preview">${thumb(r.kind)}</div>
    <div class="name">${esc(r.title)}</div>
    <div class="meta">${esc(r.meta)}</div><span class="status ${statusClass(r.status)}">${esc(r.status)}</span></button>`;

  const grouped = groupBy === 'status' && !tag;
  const body = !items.length ? `<div class="card pad muted">${query ? 'No papers match “' + esc(query) + '”.' : 'This folder is empty. Add papers or drag them here.'}</div>`
    : grouped ? GROUPS.map((g) => {
        const list = items.filter((r) => r.status === g);
        if (!list.length) return '';
        const shut = collapsed.has(g);
        return `<section class="stack" style="--gap:16px"><div class="group-head"><span>${g} (${list.length})</span><button class="toggle" data-group="${g}" aria-expanded="${!shut}">${icon(shut ? 'down' : 'up', 's16')}${shut ? 'Expand' : 'Collapse'}</button></div>
          ${shut ? '' : `<div class="files">${list.map(card).join('')}</div>`}</section>`;
      }).join('')
    : `<div class="files">${items.map(card).join('')}</div>`;

  return {
    title: name,
    html: `<div class="page rv-page">
      <div class="my-head"><nav class="breadcrumb"><a href="#/reviews">My Reviews</a>${icon('right', 's16')}<span class="current">${esc(name)}</span></nav><span class="spacer"></span>
        <span class="synced">${icon('cloud', 's16')}Synced with iBridge</span><button class="am-btn am-btn--tertiary am-btn--lead" id="newFolder"><span class="am-btn__lead">${icon('newFolder', 's16')}</span>New folder</button><button class="am-btn am-btn--secondary am-btn--lead" id="add"><span class="am-btn__lead">${icon('upload', 's16')}</span>Add papers</button></div>
      <div class="rv-title"><h3 class="page-title">${esc(name)}</h3><p>${items.length} papers · ${items.filter((r) => r.status === 'To sign').length} to sign${folder?.filedBy ? ' · filed by ' + esc(folder.filedBy) : ''}</p></div>
      ${folder?.bridgeNote ? `<div class="rv-bridge">${orb('sm', state.user.agentLook)}<span>${esc(folder.bridgeNote)}</span></div>` : ''}
      <div class="dir-toolbar"><div class="search-inset"><input id="search" placeholder="Search this folder…" value="${esc(query)}" aria-label="Search this folder"><button type="button" aria-label="Search">${icon('search')}</button></div>
        <button class="filter-pill"><span class="l">Sort</span><b>Due date</b>${icon('arrow_downward', 's16')}</button>
        ${tag ? '' : `<button class="filter-pill" id="groupBy"><span class="l">Group by</span><b>${grouped ? 'Status' : 'None'}</b>${icon('down', 's16')}</button>`}
        <button class="filter-pill"><span class="l">Classification</span><b>Any</b>${icon('down', 's16')}</button></div>
      <div class="rv-groups">${body}</div></div>`,
    mount(root) {
      root.querySelectorAll('[data-open]').forEach((b) => (b.onclick = (e) => { if (e.target.closest('[data-more]')) { e.stopPropagation(); const m = e.target.closest('[data-more]'); const pop = popover(m, `<button class="menu-item" data-a="open">${icon('eye', 's16')}Open</button><button class="menu-item" data-a="fav">${icon('star', 's16')}Favourite</button><button class="menu-item" data-a="move">${icon('newFolder', 's16')}Move to…</button>`, { align: 'right' }); pop.onclick = (ev) => { const a = ev.target.closest('[data-a]')?.dataset.a; closePopovers(); if (a === 'open') go('#/reviews/paper/' + m.dataset.more); else if (a) toast('Prototype action'); }; return; } go('#/reviews/paper/' + b.dataset.open); }));
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
        ${s.bullets ? `<ul>${s.bullets.map((b, i) => `<li${showInk && r.ink && s.id === 'dec' && i === r.ink.highlightBullet ? ' class="ink-li"' : ''}>${hl(b)}</li>`).join('')}</ul>${showInk && r.ink && s.id === 'dec' ? `<div class="ink-note">${esc(r.ink.note)}</div>` : ''}` : ''}
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

  // Right panel (LC / My Reviews / Paper): notes, voice note, Bridge card, decision buttons
  const panel = () => `<div class="stack" style="--gap:16px;flex:1">
      <span class="tiny muted">Your notes</span><div id="noteSlot"></div>
      ${r.voiceNote ? `<div class="note-card" id="voice"><div class="row" style="--gap:8px"><button class="play" aria-label="Play voice note">${icon('play')}</button><div class="grow"><b>${esc(r.voiceNote.title)}</b><div class="tiny muted">${esc(r.voiceNote.meta)}</div></div><button class="btn tertiary sm">Edit</button></div><div>${esc(r.voiceNote.transcript)}</div></div>` : ''}
      ${notes.map((n) => `<div class="note-card">${n.quote ? `<div class="quote"><span>“${esc(n.quote)}”</span></div>` : ''}${n.text ? `<div>${esc(n.text)}</div>` : ''}<span class="tiny muted">${esc(n.time || 'Just now')}</span></div>`).join('')}
      ${!notes.length && !r.voiceNote ? '<p class="small muted">Select text in the paper to highlight it, add a note or ask Bridge.</p>' : ''}
      ${r.bridge ? `<div class="note-card"><div class="nc-title">${orb('sm', state.user.agentLook)}<b>${esc(state.user.agentName)} on this paper</b></div><div>${esc(r.bridge)}</div><div class="row">${doc ? `<a class="btn tertiary sm" href="#/create/doc/${doc._id}">Ask about this paper</a>` : `<button class="btn tertiary sm" id="askPaper">Ask about this paper</button>`}</div></div>` : ''}
    </div>
    ${r.status === 'Signed' ? `<div class="alert success"><span class="alert-icon">${icon('ok')}</span><div>Signed ${esc(r.meta)}. Sent to the Cabinet Office.</div></div>`
      : `<div class="stack" style="--gap:8px"><span class="tiny muted">Your decision</span><div class="decision-row">${['Approve', 'Defer', 'Withdraw'].map((d) => `<button class="btn tertiary sm" data-decide="${d}">${d}</button>`).join('')}</div></div>`}`;

  return {
    title: r.title,
    html: `<div class="paper-view">
      <section class="doc-col">
        <div class="doc-head"><a class="icon-btn" href="#/reviews/folder/${r.folderId}" aria-label="Back to folder">${icon('left')}</a>
          <div class="title"><b>${esc(r.title)}</b><span class="small">${esc(r.kind)} · Page 1 of ${doc ? 12 : 2} · ${esc(r.status)} · ${esc(r.meta)}</span></div>
          <button class="icon-btn" id="dictate" aria-label="Record voice note">${icon('mic')}</button><button class="icon-btn" aria-label="Share">${icon('share')}</button><button class="icon-btn" aria-label="More">${icon('more')}</button>
          ${r.status !== 'Signed' ? `<button class="btn primary sm" id="sign">${r.status === 'To read' ? 'Mark as read' : 'Sign'}</button>` : ''}</div>
        <div class="toolbar"><span class="tb-txt">Page 1 / ${doc ? 12 : 2}</span><button class="icon-btn" aria-label="Zoom out">${icon('zoomOut', 's16')}</button><span class="tb-txt">100%</span><button class="icon-btn" aria-label="Zoom in">${icon('zoomIn', 's16')}</button><span class="spacer"></span>
          ${r.ink ? `<span class="switch-label">Show iPad ink</span><button class="switch" role="switch" aria-checked="true" id="ink" aria-label="Show iPad ink"></button>` : ''}</div>
        <div class="canvas" id="canvas">${page()}</div>
        <div class="doc-foot">${r.ink ? 'iPad ink on 2 pages' : 'No ink'}${r.voiceNote ? ' · 1 voice note' : ''}</div>
      </section>
      <aside class="panel" id="panel" style="padding-top:24px">${panel()}</aside></div>`,
    mount(root) {
      const redraw = () => { root.querySelector('#canvas').innerHTML = page(); root.querySelector('#panel').innerHTML = panel(); bind(); };
      const saveNotes = () => api.update('reviews', id, { notes });
      const bind = () => {
        root.querySelector('#pin')?.addEventListener('click', () => root.querySelector('#voice')?.scrollIntoView({ behavior: 'smooth' }));
        root.querySelector('#voice .play')?.addEventListener('click', () => toast('Playing voice note (prototype: no audio)'));
        root.querySelectorAll('[data-decide]').forEach((b) => (b.onclick = () => signDialog(r, b.dataset.decide)));
        root.querySelector('#askPaper')?.addEventListener('click', () => toast('Ask Bridge about this paper in Research'));
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
      <div class="stack" style="--gap:8px"><span class="label">Decision</span><div class="row wrap" id="dec">${['Approve', 'Defer', 'Withdraw'].map((d) => `<button class="chip ${d === decision ? 'selected' : ''}" data-d="${d}">${d}</button>`).join('')}</div></div>
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
