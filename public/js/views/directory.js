import { api } from '../api.js';
import { icon, esc, modal, popover, closePopovers, toast, sleep } from '../ui.js';
import { go, render as rerender } from '../app.js';

const classDot = (c) => c ? `<span class="status ${c === 'Private' ? 'neutral' : c === 'Secret' ? 'danger' : 'info'}">${esc(c)}</span>` : '—';

export async function render({ view = 'all' }) {
  if (view === 'my') return myPapers();
  if (view === 'dates') return cabinetDates();
  if (view === 'kb') return kb();
  if (view === 'ministry') return byMinistry();
  return allPapers();
}

// ---------------------------------------------------------------- All Papers
async function allPapers() {
  const papers = await api.list('papers');
  const codes = ['F(A)', 'K(A)', 'K(B)', 'K(C)', 'I(A)'];
  return {
    title: 'Directory',
    html: `<div class="page stack" style="--gap:20px">
      <h2>Directory</h2>
      <div class="row wrap" style="--gap:12px"><div class="search grow" style="max-width:420px"><input class="input" id="q" placeholder="Search titles, codes, tags…" aria-label="Search papers">${icon('search', 's16')}</div>
        <span class="chip lg">Sort <b>Cabinet date</b></span><span class="spacer"></span><span class="small muted" id="countLine"></span></div>
      <div class="row wrap"><span class="small muted">Paper code</span>${codes.map((c) => `<button class="chip" data-code="${c}">${c}</button>`).join('')}<span class="small muted">+ 18 more</span>
        <span class="spacer"></span><span class="chip">Ministry</span><span class="chip">1 Jan 2024 – 31 Dec 2024</span><span class="chip">Classification</span><span class="chip">Tags</span><button class="chip" data-issues>Data issues (14)</button></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Title</th><th>Code</th><th>Ministry</th><th>Cabinet date</th><th>Date created</th><th>Last modified</th><th>Classification</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>
      <p class="small muted">Showing a sample of 4,812 papers.</p></div>`,
    mount(root) {
      const sel = new Set();
      let issuesOnly = false;
      const draw = () => {
        const q = root.querySelector('#q').value.toLowerCase();
        const list = papers.filter((p) => (!q || (p.title + p.code + p.tags.join(' ')).toLowerCase().includes(q)) && (!sel.size || sel.has(p.code)) && (!issuesOnly || !p.cabinetDate));
        root.querySelector('#countLine').textContent = `Showing ${list.length} of 4,812`;
        root.querySelector('#rows').innerHTML = list.map((p) => `<tr class="clickable" data-id="${p._id}"><td><div class="row" style="align-items:flex-start">${icon('doc', 's16')}<div><b>${esc(p.title)}</b><div class="small muted">Topic: ${esc(p.topic)}${p.related ? ' · ' + p.related + ' related' : ''}</div></div></div></td>
          <td><span class="code-badge">${esc(p.code)}</span></td><td>${esc(p.ministry)}</td><td>${p.cabinetDate ? esc(p.cabinetDate) : '<span class="status danger">No cabinet date</span>'}</td><td>${esc(p.created)}</td><td>${esc(p.modified)}<div class="small muted">${esc(p.modifiedBy)}</div></td><td>${classDot(p.classification)}</td>
          <td><div class="row"><button class="icon-btn" data-view="${p._id}" aria-label="Open">${icon('eye', 's16')}</button><button class="icon-btn" data-share="${p._id}" aria-label="Share">${icon('share', 's16')}</button></div></td></tr>`).join('') || `<tr><td colspan="8" class="muted">No papers match.</td></tr>`;
      };
      draw();
      root.querySelector('#q').oninput = draw;
      root.querySelectorAll('[data-code]').forEach((b) => (b.onclick = () => { b.classList.toggle('selected'); sel.has(b.dataset.code) ? sel.delete(b.dataset.code) : sel.add(b.dataset.code); draw(); }));
      root.querySelector('[data-issues]').onclick = (e) => { issuesOnly = !issuesOnly; e.currentTarget.classList.toggle('selected'); draw(); };
      root.querySelector('#rows').onclick = (e) => {
        const share = e.target.closest('[data-share]');
        if (share) return shareDialog(papers.find((p) => p._id === share.dataset.share));
        const tr = e.target.closest('tr[data-id]');
        if (tr) viewer(papers.find((p) => p._id === tr.dataset.id));
      };
    },
  };
}

function viewer(p) {
  const lines = (n) => Array.from({ length: n }, (_, i) => `<div style="height:8px;border-radius:4px;background:#d9d9d9;width:${[100, 94, 98, 62, 100, 90][i % 6]}%"></div>`).join('');
  const m = modal({
    title: p.title, iconName: 'doc', wide: true,
    body: `<div class="row wrap small muted">${esc(p.code)} · ${esc(p.ministry)} · ${p.pages} pages <span class="spacer"></span><span class="tag grey">${esc(p.classification)}</span><button class="btn tertiary sm" id="share">Share</button><button class="btn tertiary sm" id="toCreate">Open in Create</button><button class="icon-btn" aria-label="Download">${icon('download')}</button></div>
      <div style="display:grid;grid-template-columns:1fr 340px;gap:24px">
        <div class="stack" style="background:var(--grey);padding:16px;border-radius:8px;align-items:center">
          <div class="row card" style="padding:4px 12px"><span class="small">Page 1 / ${p.pages}</span>${icon('zoomOut', 's16')}<span class="small">100%</span>${icon('zoomIn', 's16')}<button class="btn primary sm" id="ink">My iPad ink</button><span class="small muted">Loaded 1–5 of ${p.pages}</span></div>
          <div class="sheet" style="width:100%;max-width:560px;min-height:auto;padding:40px;font-size:13px">
            <div style="text-align:center;font-family:var(--font);font-weight:600">CABINET OF BARBADOS</div><div class="small" style="text-align:center;font-family:var(--font)">${esc(p.code)} · ${esc(p.ministryName)} · Meeting of ${esc(p.cabinetDate || '—')}</div>
            <b style="font-family:var(--font)">${esc(p.title.toUpperCase())}</b>${lines(4)}<div style="height:8px;border-radius:4px;background:var(--brand);width:100%" data-ink></div>${lines(4)}<div class="ink-note" data-ink>ask MFEI re costs?</div></div>
          <div class="small muted">${icon('sync', 's16')} Pages 6–${p.pages} load as you scroll</div></div>
        <div class="stack" style="--gap:14px"><h5>Details</h5>
          ${[['Cabinet date', p.cabinetDate || 'No cabinet date', 'From ingest manifest'], ['Paper code', p.code, ''], ['Ministry', p.ministryName, ''], ['Date created', p.created, p.createdBy], ['Last modified', p.modified, 'by ' + p.modifiedBy]].map(([k, v, s]) => `<div class="row" style="align-items:flex-start"><span class="muted" style="width:110px">${k}</span><div class="grow">${esc(v)}${s ? `<div class="small muted">${esc(s)}</div>` : ''}</div></div>`).join('')}
          <div class="row"><h5 class="grow">Tags</h5><button class="btn ghost sm">${icon('add', 's16')} Manage tags</button></div>
          <div class="small muted">Auto</div><div class="row wrap">${p.tags.map((t) => `<span class="chip lg">${esc(t)}</span>`).join('')}</div>
          ${p.peopleTags.length ? `<div class="small muted">Added by people</div><div class="row wrap">${p.peopleTags.map((t) => `<span class="chip lg">${esc(t)} ✕</span>`).join('')}</div>` : ''}
        </div></div>`,
  });
  m.el.querySelector('#ink').onclick = (e) => { e.currentTarget.classList.toggle('primary'); e.currentTarget.classList.toggle('tertiary'); m.el.querySelectorAll('[data-ink]').forEach((x) => (x.style.visibility = x.style.visibility === 'hidden' ? '' : 'hidden')); };
  m.el.querySelector('#share').onclick = () => { m.close(); shareDialog(p); };
  m.el.querySelector('#toCreate').onclick = async () => {
    const d = await api.create('documents', { title: p.title, template: 'Report', status: 'Copy from the Directory', owner: 'You', modified: 'Just now', section: 'mine', sections: [{ id: 's1', heading: 'Summary', body: 'Copied from ' + p.code + ' · ' + p.ministryName + '. Bridge can summarise this paper for you.' }], sources: [p.title], messages: [], suggestions: ['Summarise this paper', 'Draft a response'], script: [] });
    m.close(); go('#/create/doc/' + d._id);
  };
}

function shareDialog(p) {
  const isPrivate = p.classification === 'Private';
  const m = modal({
    title: `Share “${p.title}”`, iconName: 'share',
    body: `${isPrivate ? `<div class="alert warning"><span class="alert-icon">${icon('lock')}</span><div class="grow"><b>This paper is Private</b><p class="small">It can’t leave your library until you change its classification.</p></div>
        <label class="field" style="width:180px"><span class="small">Reclassify as</span><select class="select"><option>Confidential</option><option>Secret</option></select></label></div>` : ''}
      <div class="field"><label>Share with people or groups</label><div class="input" style="height:auto;min-height:40px;display:flex;flex-wrap:wrap;gap:6px;padding:6px 8px" id="to">
        <span class="chip lg">Kerry Best ✕</span><span class="chip lg">jclarke@health.gov.bb ✕</span><span class="chip lg">${icon('people', 's16')} Health Policy Unit · 8 ✕</span><input style="border:0;outline:0;flex:1;min-width:120px;background:none" placeholder="Add a name or email"></div></div>
      <div class="row" style="--gap:16px"><label class="field grow"><span class="label">Permission</span><select class="select"><option>Can comment</option><option>Can view</option><option>Can edit</option></select></label><label class="field grow"><span class="label">Access until</span><select class="select"><option>No end date</option><option>1 week</option><option>30 days</option></select></label></div>
      <label class="field"><span class="label">Message (optional)</span><textarea class="textarea">Annotated ahead of Thursday’s Cabinet. Please add your comments on §3 by Wednesday.</textarea></label>
      <p class="small muted">They get a copy of this version, including your iPad ink. If you change the paper later, the copy shows “A newer version is available”.</p>`,
    foot: `<button class="btn tertiary" id="mine">Open in Create just for me</button><button class="btn primary" id="go">${isPrivate ? 'Make Confidential and share' : 'Share'}</button>`,
  });
  m.el.querySelector('#go').onclick = () => { m.close(); toast(`Shared with 3 people and 1 group`); };
  m.el.querySelector('#mine').onclick = () => { m.close(); go('#/create/my'); };
}

// ---------------------------------------------------------------- My Papers
async function myPapers() {
  const items = await api.list('myPapers', { folderId: 'fo-health' });
  return {
    title: 'My Papers',
    html: `<div class="page stack" style="--gap:20px">
      <h2>Directory</h2>
      <div class="row"><div class="breadcrumb grow"><a href="#/directory/my">My Papers</a>${icon('right', 's16')}<span class="current">Health reform</span></div>
        <span class="tag grey">${icon('cloud', 's16')} Synced with iBridge</span><button class="btn tertiary"><span class="lead">${icon('newFolder', 's16')}</span>New folder</button><button class="btn secondary" id="upload"><span class="lead">${icon('upload', 's16')}</span>Upload papers</button></div>
      <div class="card pad row" id="drop" style="border-style:dashed;--gap:16px">${icon('upload')}<p class="grow small">Drop PDFs here to add them to Health reform. Up to 150 MB each, private to you until you share or submit them.</p><div id="uploading" class="row small" style="width:280px"></div></div>
      <div class="row"><div class="search" style="width:320px"><input class="input" placeholder="Search in Health reform…" id="q">${icon('search', 's16')}</div><span class="spacer"></span><span class="chip lg">Sort <b>Last modified</b></span><span class="chip lg">KB status <b>Any</b></span><span class="chip lg">Classification <b>Any</b></span></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Title</th><th>Date created</th><th>Last modified</th><th>Classification</th><th>Knowledge base</th><th>Due</th><th></th></tr></thead><tbody id="rows"></tbody></table></div></div>`,
    mount(root) {
      const draw = (list) => {
        root.querySelector('#rows').innerHTML = list.map((p) => `<tr class="${p.due ? 'highlight' : ''}"><td><div class="row" style="align-items:flex-start">${icon(p.type === 'folder' ? 'folder' : 'doc', 's16')}<div><b>${esc(p.title)}</b><div class="small muted">${esc(p.subtitle)}</div></div></div></td>
          <td>${esc(p.created)}</td><td>${esc(p.modified)}<div class="small muted">${esc(p.modifiedBy)}</div></td><td>${classDot(p.classification)}</td>
          <td>${p.kb === '—' ? '—' : `<span class="status ${p.kbState}">${esc(p.kb)}</span>`}${p.kbNote ? `<div class="small muted">${esc(p.kbNote)}</div>` : ''}</td><td>${esc(p.due || '')}</td>
          <td><button class="icon-btn" data-menu="${p._id}" aria-label="Actions">${icon('more')}</button></td></tr>`).join('');
      };
      draw(items);
      root.querySelector('#q').oninput = (e) => draw(items.filter((p) => p.title.toLowerCase().includes(e.target.value.toLowerCase())));
      root.querySelector('#rows').onclick = (e) => {
        const b = e.target.closest('[data-menu]');
        if (!b) return;
        const p = items.find((x) => x._id === b.dataset.menu);
        const pop = popover(b, ['Open', 'Share to Create…', 'Change classification…', 'Rename', 'Move to…', 'Download'].map((t) => `<button class="menu-item" data-a="${t}">${t}</button>`).join('') + `<button class="menu-item danger" data-a="Remove">Remove <span class="small muted">restorable 90 days</span></button>`, { align: 'right' });
        pop.onclick = async (ev) => {
          const a = ev.target.closest('[data-a]')?.dataset.a;
          if (!a) return;
          closePopovers();
          if (a === 'Share to Create…') shareDialog({ ...p, classification: p.classification || 'Private' });
          else if (a === 'Remove') { await api.remove('myPapers', p._id); toast('Moved to Removed. Restorable for 90 days.', 'Undo', async () => { await api.create('myPapers', p); rerender(); }); rerender(); }
          else if (a === 'Open') viewer({ ...p, code: 'K(A)', ministry: 'MHW', ministryName: 'Ministry of Health and Wellness', pages: 12, cabinetDate: null, tags: ['Policy area: Health'], peopleTags: [], createdBy: 'You' });
          else toast(a.replace('…', '') + ' (prototype)');
        };
      };
      const upload = async () => {
        const el = root.querySelector('#uploading');
        el.innerHTML = `<span class="grow">NHI costing model v3.pdf</span><div class="progress" style="width:90px"><span style="width:0%"></span></div><span id="pct">0%</span>`;
        for (let i = 10; i <= 100; i += 15) { await sleep(250); if (!document.body.contains(el)) return; el.querySelector('.progress span').style.width = i + '%'; el.querySelector('#pct').textContent = Math.min(i, 100) + '%'; }
        await api.create('myPapers', { folderId: 'fo-health', type: 'paper', title: 'NHI costing model v3', subtitle: 'Health reform', created: 'Today', modified: 'Just now', modifiedBy: 'You', classification: 'Private', kb: '—', kbState: 'neutral', due: null });
        toast('NHI costing model v3 uploaded'); rerender();
      };
      root.querySelector('#upload').onclick = upload;
      const drop = root.querySelector('#drop');
      drop.ondragover = (e) => { e.preventDefault(); drop.style.borderColor = 'var(--text)'; };
      drop.ondrop = (e) => { e.preventDefault(); upload(); };
    },
  };
}

// ---------------------------------------------------------------- other directory views
async function byMinistry() {
  const papers = await api.list('papers');
  const groups = {};
  papers.forEach((p) => (groups[p.ministryName] = groups[p.ministryName] || []).push(p));
  return {
    title: 'By Ministry',
    html: `<div class="page stack" style="--gap:20px"><h2>By Ministry</h2>
      ${Object.entries(groups).map(([m, ps]) => `<div class="stack" style="--gap:8px"><div class="row"><h5 class="grow">${esc(m)}</h5><span class="small muted">${ps.length} papers</span></div>
        <div class="list">${ps.map((p) => `<div class="list-row">${icon('doc', 's16')}<span class="grow">${esc(p.title)}</span><span class="code-badge">${p.code}</span><span class="small muted">${esc(p.cabinetDate || '—')}</span></div>`).join('')}</div></div>`).join('')}</div>`,
  };
}

async function kb() {
  const items = (await api.list('myPapers')).filter((p) => p.kbState === 'warning' || p.kbState === 'danger');
  return {
    title: 'KB submissions',
    html: `<div class="page stack" style="--gap:20px"><h2>KB submissions</h2><p class="muted">Papers people submitted to the knowledge base Bridge searches. Admins accept or reject them.</p>
      <div class="list">${items.map((p) => `<div class="list-row">${icon('doc', 's16')}<div class="grow"><b>${esc(p.title)}</b><div class="small muted">${esc(p.kbNote || '')}</div></div><span class="status ${p.kbState}">${esc(p.kb)}</span><button class="btn tertiary sm">Reject</button><button class="btn primary sm">Accept</button></div>`).join('')}</div></div>`,
  };
}

async function cabinetDates() {
  const rows = await api.list('cabinetDates');
  return {
    title: 'Cabinet dates',
    html: `<div class="page stack" style="--gap:20px"><h2>Cabinet dates</h2>
      <div class="card pad row" style="--gap:16px"><div class="grow"><b>Import cabinet dates from the ingest manifest</b><p class="small muted">CSV or JSON from ingester --export-manifest: one row per file with its source folder and cabinet date.</p></div><button class="btn tertiary sm">Example file</button><button class="btn secondary" id="up"><span class="lead">${icon('upload', 's16')}</span>Upload manifest</button></div>
      <div class="alert success" id="result"><span class="alert-icon">${icon('check')}</span><div><b>cabinet-manifest-2025-01-30.csv imported</b><p class="small">4,655 papers updated · 12 unchanged · 31 rows matched no paper</p></div></div>
      <div class="stat-grid"><div class="card stat"><div class="v">4,812</div><div class="small muted">Papers in the corpus</div></div><div class="card stat"><div class="v">4,667</div><div class="small muted">With a cabinet date</div></div><div class="card stat"><div class="v">14</div><div class="small muted">Cabinet date is not a Thursday</div></div><div class="card stat"><div class="v">131</div><div class="small muted">No cabinet date</div></div></div>
      <div class="row"><div class="tabs grow" id="tabs"><button class="tab active" data-t="notThursday">Not a Thursday (14)</button><button class="tab" data-t="noDate">No cabinet date (131)</button><button class="tab" data-t="unmatched">Unmatched manifest rows (31)</button></div><button class="btn tertiary sm">Export list</button></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Title</th><th>Code</th><th>Source folder</th><th>Cabinet date</th><th>Weekday</th><th></th></tr></thead><tbody id="rows"></tbody></table></div></div>`,
    mount(root) {
      const draw = (t) => {
        const list = rows.filter((r) => r.issue === t);
        root.querySelector('#rows').innerHTML = list.map((r) => `<tr><td>${esc(r.title)}</td><td><span class="code-badge">${r.code}</span></td><td class="small">${esc(r.folder)}</td><td>${esc(r.cabinetDate || '—')}</td><td>${esc(r.weekday)}</td><td><button class="btn tertiary sm">Edit date</button></td></tr>`).join('') || `<tr><td colspan="6" class="muted">Nothing to fix in this sample.</td></tr>`;
      };
      draw('notThursday');
      root.querySelector('#tabs').onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; root.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === b)); draw(b.dataset.t); };
      root.querySelector('#up').onclick = () => toast('Manifest imported (prototype)');
    },
  };
}
