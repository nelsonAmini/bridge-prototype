import { api } from '../api.js';
import { icon, esc, modal, popover, closePopovers, toast, sleep } from '../ui.js';
import { go, render as rerender } from '../app.js';

// Directory v2 (Figma page 03). Data Status for classification, Code Badge for paper codes.
const classDot = (c) => c ? `<span class="status ${c === 'Private' ? 'neutral' : c === 'Secret' ? 'danger' : 'info'}">${esc(c)}</span>` : '—';
const pager = `<span class="am-pagination"><button disabled aria-label="First">${icon('first_page', 's16')}</button><button disabled aria-label="Previous">${icon('keyboard_arrow_left', 's16')}</button><button class="is-current">1</button><button aria-label="Next">${icon('keyboard_arrow_right', 's16')}</button><button aria-label="Last">${icon('last_page', 's16')}</button></span>`;

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
  const codes = ['A03', 'E', 'F', 'F(A)', 'K(A)', 'K(B)', 'K(C)', 'I(A)'];
  const sel = new Set(['K(A)', 'K(B)']);
  const codeChip = (c) => `<button class="code-chip ${sel.has(c) ? 'selected' : ''}" data-code="${c}">${sel.has(c) ? icon('check', 's16') : ''}${c}</button>`;
  const th = (t, sort = true) => `<th><span>${t}${sort ? icon('sort', 's16') : ''}</span></th>`;
  return {
    title: 'Directory',
    html: `<div class="page dir-page">
      <h3 class="page-title">Directory</h3>
      <div class="dir-filters"><div class="dir-toolbar"><div class="search-inset"><input id="q" placeholder="Search titles, codes, tags…" aria-label="Search papers"><button type="button" aria-label="Search">${icon('search')}</button></div>
        <button class="filter-pill"><span class="l">Sort</span><b>Cabinet date</b>${icon('arrow_downward', 's16')}</button><span class="sp"></span><span class="count-line" id="countLine"></span></div>
      <div class="filter-panel">
        <div class="frow"><span class="lbl">Paper code</span><span id="codes" class="frow">${codes.map(codeChip).join('')}</span><button class="code-chip">+ 18 more</button></div>
        <div class="frow"><span class="lbl">Refine</span><button class="filter-pill"><span class="l">Ministry</span><b>Any</b>${icon('down', 's16')}</button><button class="filter-pill">${icon('calendar', 's16')}<span class="l">Cabinet date</span><b>1 Jan 2024 – 31 Dec 2024</b></button><button class="filter-pill"><span class="l">Classification</span><b>Any</b>${icon('down', 's16')}</button><button class="filter-pill">${icon('label', 's16')}<span class="l">Tags</span><b>Health</b>${icon('close', 's16')}</button><button class="filter-pill issues" data-issues>${icon('warning', 's16')}<b>Data issues (14)</b></button></div></div></div>
      <div class="table-wrap"><table class="dir-table"><colgroup><col style="width:228px"><col style="width:64px"><col style="width:64px"><col style="width:144px"><col style="width:135px"><col style="width:135px"><col style="width:135px"><col style="width:88px"></colgroup><thead><tr>${th('Title')}<th>Code</th><th>Ministry</th>${th('Cabinet date')}${th('Date created')}${th('Last modified')}${th('Classification')}<th></th></tr></thead><tbody id="rows"></tbody></table></div>
      <div class="dir-foot"><span class="grow" id="footLine"></span><div class="select-inset"><select aria-label="Rows per page"><option>10 per page</option><option>25 per page</option></select><span>${icon('unfold_more')}</span></div>${pager}</div></div>`,
    mount(root) {
      let issuesOnly = false;
      const draw = () => {
        const q = root.querySelector('#q').value.toLowerCase();
        const list = papers.filter((p) => (!q || (p.title + p.code + p.tags.join(' ')).toLowerCase().includes(q)) && (q || !sel.size || sel.has(p.code)) && (!issuesOnly || !p.cabinetDate));
        root.querySelector('#countLine').textContent = `Showing 1–${list.length} of ${list.length} (filtered from 4,812)`;
        root.querySelector('#footLine').textContent = `Showing 1–${list.length} of ${list.length} papers`;
        root.querySelector('#rows').innerHTML = list.map((p) => `<tr class="clickable" data-id="${p._id}"><td><div class="tcell">${icon('doc', 's16')}<div><div>${esc(p.title)}</div><span class="sub">${p.sub ? esc(p.sub) : `Topic: ${esc(p.topic)}${p.related ? ' · ' + p.related + ' related' : ''}`}</span></div></div></td>
          <td><span class="code-badge">${esc(p.code)}</span></td><td>${esc(p.ministry)}</td><td>${!p.cabinetDate ? '<span class="status danger">No cabinet date</span>' : p.dateFlag ? `<span class="status warning">${esc(p.dateFlag)}</span><span class="sub small">${esc(p.cabinetDate)}</span>` : esc(p.cabinetDate)}</td><td>${esc(p.created)}</td><td>${esc(p.modified)}<span class="sub">${esc(p.modifiedBy)}</span></td><td>${classDot(p.classification)}</td>
          <td><div class="acts"><button class="icon-btn sm" data-view="${p._id}" aria-label="Open">${icon('eye', 's16')}</button><button class="icon-btn sm" data-share="${p._id}" aria-label="Share">${icon('share', 's16')}</button><button class="icon-btn sm" data-more="${p._id}" aria-label="More" data-popover-anchor>${icon('more', 's16')}</button></div></td></tr>`).join('') || `<tr><td colspan="8" class="muted">No papers match. Clear a filter or search all 4,812 papers.</td></tr>`;
      };
      draw();
      root.querySelector('#q').oninput = draw;
      root.querySelector('#codes').onclick = (e) => {
        const b = e.target.closest('[data-code]'); if (!b) return;
        const c = b.dataset.code; sel.has(c) ? sel.delete(c) : sel.add(c);
        b.outerHTML = codeChip(c); draw();
      };
      root.querySelector('[data-issues]').onclick = (e) => { issuesOnly = !issuesOnly; e.currentTarget.classList.toggle('on', issuesOnly); draw(); };
      root.querySelector('#rows').onclick = (e) => {
        const share = e.target.closest('[data-share]');
        if (share) return shareDialog(papers.find((p) => p._id === share.dataset.share));
        const more = e.target.closest('[data-more]');
        if (more) { const pop = popover(more, `<button class="menu-item" data-a="open">${icon('eye', 's16')}Open</button><button class="menu-item" data-a="create">${icon('share', 's16')}Share to Create…</button><button class="menu-item" data-a="dl">${icon('download', 's16')}Download</button>`, { align: 'right' }); pop.onclick = (ev) => { const a = ev.target.closest('[data-a]')?.dataset.a; if (!a) return; closePopovers(); if (a === 'open') viewer(papers.find((p) => p._id === more.dataset.more)); else toast(a === 'dl' ? 'Downloading (prototype)' : 'Choose who to share with'); }; return; }
        const tr = e.target.closest('tr[data-id]');
        if (tr) viewer(papers.find((p) => p._id === tr.dataset.id));
      };
      // Arrived from Search: open that paper in the viewer
      const want = sessionStorage.getItem('bridge-open-paper');
      if (want) { sessionStorage.removeItem('bridge-open-paper'); const p = papers.find((x) => x._id === want); if (p) viewer(p); }
    },
  };
}

// LC / Directory v2 / Document Viewer (+ Paper Details Panel)
function viewer(p) {
  const lines = (n) => Array.from({ length: n }, (_, i) => `<div style="height:8px;border-radius:4px;background:var(--am-surface-neutral-subtle);width:${[100, 94, 98, 62, 100, 90][i % 6]}%"></div>`).join('');
  const m = modal({
    title: p.title, iconName: 'doc', wide: true,
    body: `<div class="row wrap"><span class="class-tag">${esc(p.classification)}</span><span class="small muted">${esc(p.code)} · ${esc(p.ministry)} · ${p.pages} pages</span><span class="spacer"></span><button class="chip-btn" id="dl">${icon('download', 's16')}Download</button><button class="chip-btn" id="share">${icon('share', 's16')}Share</button><button class="btn secondary sm" id="toCreate">Open in Create</button></div>
      <div style="display:grid;grid-template-columns:1fr 340px;gap:24px">
        <div class="stack" style="background:var(--grey);padding:16px;border-radius:8px;align-items:center">
          <div class="row card" style="padding:4px 12px"><span class="small">Page 1 / ${p.pages}</span><button class="icon-btn xs" aria-label="Zoom out">${icon('zoomOut', 's16')}</button><span class="small">100%</span><button class="icon-btn xs" aria-label="Zoom in">${icon('zoomIn', 's16')}</button><span class="small">My iPad ink</span><button class="switch" role="switch" aria-checked="true" id="ink" aria-label="Show iPad ink"></button></div>
          <div class="sheet" style="width:100%;max-width:560px;min-height:auto;padding:40px;font-size:13px">
            <div style="text-align:center;font-family:var(--font);font-weight:600">CABINET OF BARBADOS</div><div class="small" style="text-align:center;font-family:var(--font)">${esc(p.code)} · ${esc(p.ministryName)} · Meeting of ${esc(p.cabinetDate || '—')}</div>
            <b style="font-family:var(--font)">${esc(p.title.toUpperCase())}</b>${lines(4)}<div style="height:8px;border-radius:4px;background:var(--brand);width:100%" data-ink></div>${lines(4)}<div class="ink-note" data-ink>ask MFEI re costs?</div></div>
          <div class="small muted row">${icon('sync', 's16')} Pages 6–${p.pages} load as you scroll</div></div>
        <div class="stack" style="--gap:16px"><h5>Details</h5>
          ${[['Cabinet date', p.cabinetDate || 'No cabinet date', 'From ingest manifest'], ['Paper code', p.code, ''], ['Ministry', p.ministryName, ''], ['Date created', p.created, p.createdBy], ['Last modified', p.modified, 'by ' + p.modifiedBy]].map(([k, v, s]) => `<div class="row" style="align-items:flex-start"><span class="muted small" style="width:110px">${k}</span><div class="grow small">${esc(v)}${s ? `<div class="tiny muted">${esc(s)}</div>` : ''}</div></div>`).join('')}
          <div class="row"><h5 class="grow">Tags</h5><button class="chip-btn">${icon('edit', 's16')}Manage tags</button></div>
          <div class="tiny muted">Auto</div><div class="row wrap">${p.tags.map((t) => `<span class="tag outline">${esc(t)}</span>`).join('')}</div>
          ${p.peopleTags.length ? `<div class="tiny muted">Added by people</div><div class="row wrap">${p.peopleTags.map((t) => `<span class="tag outline">${esc(t)} ${icon('close', 's16')}</span>`).join('')}</div>` : ''}
        </div></div>`,
  });
  m.el.querySelector('#ink').onclick = (e) => { const on = e.currentTarget.getAttribute('aria-checked') !== 'true'; e.currentTarget.setAttribute('aria-checked', on); m.el.querySelectorAll('[data-ink]').forEach((x) => (x.style.visibility = on ? '' : 'hidden')); };
  m.el.querySelector('#share').onclick = () => { m.close(); shareDialog(p); };
  m.el.querySelector('#dl').onclick = () => toast('Downloading (prototype)');
  m.el.querySelector('#toCreate').onclick = async () => {
    const d = await api.create('documents', { title: p.title, template: 'Report', status: 'Copy from the Directory', owner: 'You', modified: 'Just now', section: 'mine', sections: [{ id: 's1', heading: 'Summary', body: 'Copied from ' + p.code + ' · ' + p.ministryName + '. Bridge can summarise this paper for you.' }], sources: [p.title], messages: [], suggestions: ['Summarise this paper', 'Draft a response'], script: [] });
    m.close(); go('#/create/doc/' + d._id);
  };
}

// LC / Directory v2 / Share Dialog
function shareDialog(p) {
  const isPrivate = p.classification === 'Private';
  const m = modal({
    title: `Share “${p.title}”`, iconName: 'share',
    body: `${isPrivate ? `<div class="alert warning"><span class="alert-icon">${icon('lock')}</span><div class="grow"><b>This paper is Private</b><p>It can’t leave your library until you change its classification.</p></div>
        <label class="field" style="width:180px"><span class="small">Reclassify as</span><select class="select sm"><option>Confidential</option><option>Secret</option></select></label></div>` : ''}
      <div class="field"><label>Share with people or groups</label><div class="am-input-tags" id="to">
        <span class="am-input-tag"><span class="avatar">KB</span>Kerry Best<button aria-label="Remove">${icon('close', 's16')}</button></span><span class="am-input-tag">jclarke@health.gov.bb<button aria-label="Remove">${icon('close', 's16')}</button></span><span class="am-input-tag">${icon('people', 's16')}Health Policy Unit · 8<button aria-label="Remove">${icon('close', 's16')}</button></span><input placeholder="Add a name or email"></div></div>
      <div class="row" style="--gap:16px;align-items:flex-start"><label class="field grow"><span class="label">Permission</span><select class="select"><option>Can comment</option><option>Can view</option><option>Can edit</option></select></label><label class="field grow"><span class="label">Access until</span><select class="select"><option>No end date</option><option>1 week</option><option>30 days</option></select></label></div>
      <label class="field"><span class="label">Message <span class="am-label__optional">(optional)</span></span><textarea class="textarea">Annotated ahead of Thursday’s Cabinet. Please add your comments on §3 by Wednesday.</textarea></label>
      <p class="small muted">They get a copy of this version, including your iPad ink. If you change the paper later, the copy shows “A newer version is available”.</p>`,
    foot: `<button class="btn tertiary sm" id="mine">Open in Create just for me</button><button class="btn primary sm" id="go">${isPrivate ? 'Make Confidential and share' : 'Share'}</button>`,
  });
  m.el.querySelector('#to').onclick = (e) => { const x = e.target.closest('.am-input-tag button'); if (x) x.parentElement.remove(); };
  m.el.querySelector('#go').onclick = () => { m.close(); toast(`Shared with 3 people and 1 group`); };
  m.el.querySelector('#mine').onclick = () => { m.close(); go('#/create/my'); };
}

// ---------------------------------------------------------------- My Papers
async function myPapers() {
  const items = await api.list('myPapers', { folderId: 'fo-health' });
  return {
    title: 'My Papers',
    html: `<div class="page dir-page">
      <h3 class="page-title">Directory</h3>
      <div class="my-head"><div class="breadcrumb"><a href="#/directory/my">My Papers</a>${icon('right', 's16')}<span class="current">Health reform</span></div><span class="spacer"></span>
        <span class="synced">${icon('cloud', 's16')}Synced with iBridge</span><button class="am-btn am-btn--tertiary am-btn--lead"><span class="am-btn__lead">${icon('newFolder', 's16')}</span>New folder</button><button class="am-btn am-btn--secondary am-btn--lead" id="upload"><span class="am-btn__lead">${icon('upload', 's16')}</span>Upload papers</button></div>
      <div class="drop-strip" id="drop">${icon('upload')}<p class="grow">Drop PDFs here to add them to Health reform. Up to 150 MB each, private to you until you share or submit them.</p><div id="uploading" class="up-prog"></div></div>
      <div class="dir-toolbar"><div class="search-inset"><input placeholder="Search in Health reform…" id="q" aria-label="Search in Health reform"><button type="button" aria-label="Search">${icon('search')}</button></div><button class="filter-pill"><span class="l">Sort</span><b>Last modified</b>${icon('arrow_downward', 's16')}</button><button class="filter-pill"><span class="l">KB status</span><b>Any</b>${icon('down', 's16')}</button><button class="filter-pill"><span class="l">Classification</span><b>Any</b>${icon('down', 's16')}</button></div>
      <div class="table-wrap"><table class="dir-table"><colgroup><col style="width:320px"><col span="5" style="width:126px"><col style="width:48px"></colgroup><thead><tr><th><span>Title${icon('sort', 's16')}</span></th><th>Date created</th><th><span>Last modified${icon('sort', 's16')}</span></th><th>Classification</th><th>Knowledge base</th><th><span>Due${icon('sort', 's16')}</span></th><th></th></tr></thead><tbody id="rows"></tbody></table></div>
      <div class="dir-foot"><span class="grow" id="foot"></span><div class="select-inset"><select aria-label="Rows per page"><option>10 per page</option></select><span>${icon('unfold_more')}</span></div>${pager}</div></div>`,
    mount(root) {
      const draw = (list) => {
        root.querySelector('#foot').textContent = `Showing 1 to ${list.length} of ${list.length} items`;
        root.querySelector('#rows').innerHTML = list.map((p) => `<tr><td><div class="tcell">${icon(p.type === 'folder' ? 'folder' : 'doc', 's16')}<div><div>${esc(p.title)}</div><span class="sub">${esc(p.subtitle)}</span></div></div></td>
          <td>${esc(p.created)}</td><td>${esc(p.modified)}<span class="sub">${esc(p.modifiedBy)}</span></td><td>${classDot(p.classification)}</td>
          <td>${p.kb === '—' || p.kbState === 'neutral' ? esc(p.kb) : `<span class="status ${p.kbState}">${esc(p.kb)}</span>`}${p.kbNote ? `<span class="sub small">${esc(p.kbNote)}</span>` : ''}</td><td>${esc(p.due || '')}</td>
          <td><button class="icon-btn sm" data-menu="${p._id}" aria-label="Actions" data-popover-anchor>${icon('more', 's16')}</button></td></tr>`).join('');
      };
      draw(items);
      root.querySelector('#q').oninput = (e) => draw(items.filter((p) => p.title.toLowerCase().includes(e.target.value.toLowerCase())));
      root.querySelector('#rows').onclick = (e) => {
        const b = e.target.closest('[data-menu]');
        if (!b) return;
        const p = items.find((x) => x._id === b.dataset.menu);
        const mi = (a, ic) => `<button class="menu-item" data-a="${a}">${icon(ic, 's16')}${a}</button>`;
        const pop = popover(b, mi('Open', 'eye') + mi('Share to Create…', 'share') + mi('Change classification…', 'lock') + '<div class="menu-sep"></div>' + mi('Rename', 'edit') + mi('Move to…', 'newFolder') + mi('Download', 'download') + `<div class="menu-sep"></div><button class="menu-item danger" data-a="Remove">${icon('trash', 's16')}Remove<span class="menu-hint">restorable 90 days</span></button>`, { align: 'right' });
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
        el.innerHTML = `<span>NHI costing model v3.pdf</span><div class="progress" style="width:115px"><span style="width:0%"></span></div><span id="pct">0%</span>`;
        for (let i = 10; i <= 100; i += 15) { await sleep(250); if (!document.body.contains(el)) return; el.querySelector('.progress span').style.width = i + '%'; el.querySelector('#pct').textContent = Math.min(i, 100) + '%'; }
        await api.create('myPapers', { folderId: 'fo-health', type: 'paper', title: 'NHI costing model v3', subtitle: 'Health reform', created: 'Today', modified: 'Just now', modifiedBy: 'You', classification: 'Private', kb: '—', kbState: 'neutral', due: null });
        toast('NHI costing model v3 uploaded'); rerender();
      };
      root.querySelector('#upload').onclick = upload;
      const drop = root.querySelector('#drop');
      drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
      drop.ondragleave = () => drop.classList.remove('over');
      drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); upload(); };
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
    html: `<div class="page stack" style="--gap:24px"><h3 class="page-title">By Ministry</h3>
      ${Object.entries(groups).map(([m, ps]) => `<div class="stack" style="--gap:8px"><div class="row"><h5 class="grow">${esc(m)}</h5><span class="am-counter">${ps.length}</span></div>
        <div class="list">${ps.map((p) => `<div class="list-row">${icon('doc', 's16')}<span class="grow">${esc(p.title)}</span><span class="code-badge">${p.code}</span><span class="small muted">${esc(p.cabinetDate || '—')}</span></div>`).join('')}</div></div>`).join('')}</div>`,
  };
}

async function kb() {
  const items = (await api.list('myPapers')).filter((p) => p.kbState === 'warning' || p.kbState === 'danger');
  return {
    title: 'KB submissions',
    html: `<div class="page stack" style="--gap:24px"><div><h3 class="page-title">KB submissions</h3><p class="muted">Papers people submitted to the knowledge base Bridge searches. Admins accept or reject them.</p></div>
      <div class="list">${items.map((p) => `<div class="list-row">${icon('doc', 's16')}<div class="grow"><div>${esc(p.title)}</div><div class="small muted">${esc(p.kbNote || '')}</div></div><span class="status ${p.kbState}">${esc(p.kb)}</span><button class="btn tertiary sm">Reject</button><button class="btn primary sm">Accept</button></div>`).join('')}</div></div>`,
  };
}

async function cabinetDates() {
  const rows = await api.list('cabinetDates');
  const stat = (v, l) => `<div class="stat"><div class="v">${v}</div><div class="n">${l}</div></div>`;
  return {
    title: 'Cabinet dates',
    html: `<div class="page stack" style="--gap:24px"><h3 class="page-title">Cabinet dates</h3>
      <div class="card pad row" style="--gap:16px"><div class="grow"><b class="small" style="font-weight:700">Import cabinet dates from the ingest manifest</b><p class="small muted">CSV or JSON from ingester --export-manifest: one row per file with its source folder and cabinet date.</p></div><button class="btn tertiary sm">Example file</button><button class="btn secondary sm" id="up"><span class="lead">${icon('upload', 's16')}</span>Upload manifest</button></div>
      <div class="alert success" id="result"><span class="alert-icon">${icon('ok')}</span><div class="grow"><b>cabinet-manifest-2025-01-30.csv imported</b><p>4,655 papers updated · 12 unchanged · 31 rows matched no paper</p></div></div>
      <div class="stat-grid" style="grid-template-columns:repeat(4,1fr)">${stat('4,812', 'Papers in the corpus')}${stat('4,667', 'With a cabinet date')}${stat('14', 'Cabinet date is not a Thursday')}${stat('131', 'No cabinet date')}</div>
      <div class="row"><div class="tabs grow" id="tabs"><button class="tab active" data-t="notThursday">Not a Thursday (14)</button><button class="tab" data-t="noDate">No cabinet date (131)</button><button class="tab" data-t="unmatched">Unmatched manifest rows (31)</button></div><button class="btn tertiary sm">Export list</button></div>
      <div class="table-wrap"><table class="table dir-table"><thead><tr><th>Title</th><th>Code</th><th>Source folder</th><th>Cabinet date</th><th>Weekday</th><th></th></tr></thead><tbody id="rows"></tbody></table></div></div>`,
    mount(root) {
      const draw = (t) => {
        const list = rows.filter((r) => r.issue === t);
        root.querySelector('#rows').innerHTML = list.map((r) => `<tr><td>${esc(r.title)}</td><td><span class="code-badge">${r.code}</span></td><td class="small">${esc(r.folder)}</td><td>${esc(r.cabinetDate || '—')}</td><td>${r.weekday && r.weekday !== 'Thursday' ? `<span class="status warning">${esc(r.weekday)}</span>` : esc(r.weekday || '—')}</td><td><button class="btn tertiary sm">Edit date</button></td></tr>`).join('') || `<tr><td colspan="6" class="muted">Nothing to fix in this sample.</td></tr>`;
      };
      draw('notThursday');
      root.querySelector('#tabs').onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; root.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === b)); draw(b.dataset.t); };
      root.querySelector('#up').onclick = () => toast('Manifest imported (prototype)');
    },
  };
}
