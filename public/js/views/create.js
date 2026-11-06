import { api } from '../api.js';
import { icon, esc, thumb, orb, toast } from '../ui.js';
import { go } from '../app.js';

const CATS = [['All templates', 'library'], ['Recents', 'history'], ['Blank', 'doc'], ['Cabinet papers', 'bank'], ['Travel', 'flight'], ['Police', 'police'], ['Memos & letters', 'mail'], ['-'], ['My templates', 'bookmark']];

const SKELETON = [
  { id: 'meta', heading: null, style: 'meta', body: '' },
  { id: 'moc', heading: '1. Matter for consideration', body: '', placeholder: 'What Cabinet is being asked to consider, and why now.' },
  { id: 'dec', heading: '2. Decision requested', body: '', placeholder: 'It is recommended that Cabinet…' },
  { id: 'bg', heading: '3. Background', body: '', placeholder: 'Policy history, previous decisions and the current position.' },
  { id: 'fin', heading: '4. Financial implications', body: '', placeholder: 'Costs, source of funds and savings.' },
];

export async function newDocument(tpl) {
  const base = { owner: 'You', modified: 'Just now', section: 'mine', sources: [], suggestions: [], comments: [] };
  if (tpl.kind === 'Blank') {
    return api.create('documents', { ...base, title: '', template: 'Blank', status: 'Draft', sections: [], messages: [], script: 'blank', step: 0 });
  }
  if (tpl.kind === 'Cabinet Paper') {
    return api.create('documents', { ...base, title: 'Untitled Cabinet paper', template: 'Cabinet Paper', status: 'Cabinet paper template', sections: SKELETON, flow: 'cabinet', stage: 'initial',
      messages: [{ role: 'bridge', time: 'now', text: 'This is the Cabinet paper template. Tell me what the paper is about and add any sources, and I’ll draft each section for you to review.' }] });
  }
  return api.create('documents', { ...base, title: 'Untitled ' + tpl.name.toLowerCase(), template: tpl.name, status: 'Draft', sections: [{ id: 's1', heading: 'Summary', body: '', placeholder: 'Start writing…' }], messages: [] });
}

export async function render({ view = 'templates' }) {
  const slugs = CATS.filter((c) => c[0] !== '-').map((c) => slug(c[0]));
  if (view !== 'templates' && !slugs.includes(view)) return docList(view);
  const cat = (CATS.find((c) => slug(c[0]) === view) || CATS[0])[0];
  const tpls = await api.list('templates');
  const card = (t) => `<button class="tpl" data-tpl="${t._id}"><span class="frame">${thumb(t.kind)}</span><b>${esc(t.name)}</b><span class="small">${esc(t.used || t.description)}</span></button>`;
  const section = (title, list) => list.length ? `<div class="tpl-section"><h5>${esc(title)}<span>${list.length} templates</span></h5><div class="tpl-grid">${list.map(card).join('')}</div></div>` : '';
  let body;
  if (cat === 'All templates') body = section('Recents', tpls.filter((t) => t.recent)) + section('Cabinet papers', tpls.filter((t) => t.category === 'Cabinet papers'));
  else if (cat === 'Recents') body = section('Recents', tpls.filter((t) => t.recent));
  else if (cat === 'My templates') body = `<div class="card" style="border-style:dashed"><div class="am-empty am-empty--block">${icon('bookmark', 's40')}<b class="small" style="font-weight:700;color:var(--text)">No templates yet</b><span class="small">Save any document as a template from its ⋯ menu and it will appear here.</span></div></div>`;
  else body = section(cat, tpls.filter((t) => t.category === cat)) || `<p class="muted">No ${esc(cat.toLowerCase())} templates yet.</p>`;
  return {
    title: 'Create',
    html: `<div class="page full"><div class="chooser">
      <aside class="chooser-rail"><div class="rail-label">Templates</div>
        ${CATS.map((c) => c[0] === '-' ? '<div class="rail-sep"></div>' : `<a class="menu-item ${c[0] === cat ? 'active' : ''}" href="#/create/${c[0] === 'All templates' ? '' : slug(c[0])}">${icon(c[1], 's16')}${esc(c[0])}</a>`).join('')}
        <div class="lang">English (Barbados) ${icon('down', 's16')}</div></aside>
      <section class="chooser-main"><div class="chooser-body">
        <h3 class="page-title">Choose a template</h3>
        ${cat === 'All templates' ? `<div class="hero-card"><div class="eyebrow">${orb('sm')}Bridge Assistant</div><h3>Draft with Bridge</h3><p>Describe the paper you need. Bridge picks the right template, drafts every section and cites your sources.</p><button class="go" data-kind="Cabinet Paper">Start with a prompt ${icon('right', 's16')}</button>
          <div class="papers" aria-hidden="true"><span style="left:0;top:20px;transform:rotate(-8deg)">${thumb('Travel')}</span><span style="left:150px;top:30px;transform:rotate(8deg)">${thumb('Report')}</span><span style="left:70px;top:0">${thumb('Cabinet Paper')}</span></div></div>` : ''}
        ${body}
      </div>
      <footer class="chooser-foot"><div class="grow" id="selLabel"><b>Select a template</b><div class="small">Or start with a prompt above.</div></div><a class="btn tertiary" href="#/create/my">Cancel</a><button class="btn primary" id="createBtn" disabled>Create</button></footer></section>
    </div></div>`,
    mount(root) {
      let chosen = null;
      const pick = (b) => {
        root.querySelectorAll('.tpl').forEach((x) => x.classList.toggle('selected', x === b));
        chosen = tpls.find((t) => t._id === b.dataset.tpl);
        root.querySelector('#selLabel').innerHTML = `<b>${esc(chosen.name)}</b><div class="small">${esc(chosen.selectNote || chosen.description)}</div>`;
        root.querySelector('#createBtn').disabled = false;
      };
      root.querySelectorAll('[data-tpl]').forEach((b) => { b.onclick = () => pick(b); b.ondblclick = () => root.querySelector('#createBtn').click(); });
      const first = root.querySelector('[data-tpl="tpl-blank"]'); if (first) pick(first);
      root.querySelector('#createBtn').onclick = async () => { const d = await newDocument(chosen); go('#/create/doc/' + d._id); };
      root.querySelector('[data-kind]')?.addEventListener('click', async () => { const d = await newDocument(tpls.find((t) => t.kind === 'Cabinet Paper')); go('#/create/doc/' + d._id); });
    },
  };
}

const slug = (c) => c.toLowerCase().replace(/[^a-z]+/g, '-').replace(/-$/, '');

async function docList(view) {
  const docs = await api.list('documents');
  const list = view === 'shared' ? docs.filter((d) => d.section === 'shared') : view === 'pinned' ? docs.filter((d) => d.pinned) : docs.filter((d) => d.section === 'mine');
  const title = { my: 'My documents', shared: 'Shared with me', pinned: 'Pinned' }[view] || 'Documents';
  return {
    title,
    html: `<div class="page stack" style="--gap:20px"><div class="row"><h3 class="page-title grow">${title}</h3><a class="btn primary sm" href="#/create"><span class="lead">${icon('add', 's16')}</span>New document</a></div>
      ${view === 'shared' ? `<div class="alert"><span class="alert-icon">${icon('info')}</span><div class="grow"><b>A newer version of “Notes – PAHO briefing” is available</b><p class="small">Horace changed it in My Papers on 3 Feb. Your comments stay on your copy.</p></div><button class="btn tertiary sm" id="diff">See what changed</button><button class="btn secondary sm" id="upd">Update copy</button></div>` : ''}
      ${list.length ? `<div class="list doclist">${list.map((d) => `<a class="list-row" href="#/create/doc/${d._id}">${thumbSmall()}<div class="grow"><b>${esc(d.title || 'Untitled')}</b><div class="small muted">${esc(d.template)} · ${esc(d.status)}</div></div><span class="small muted">${esc(d.owner)} · ${esc(d.modified)}</span>${d.pinned ? icon('bookmark', 's16') : ''}</a>`).join('')}</div>`
        : `<div class="card pad muted">Nothing here yet.</div>`}</div>`,
    mount(root) {
      root.querySelector('#upd')?.addEventListener('click', () => toast('Your copy is up to date. Your comments were kept.'));
      root.querySelector('#diff')?.addEventListener('click', () => toast('§3 now cites the CARPHA costing (prototype)'));
    },
  };
}
const thumbSmall = () => `<span style="width:28px;height:36px;border:1px solid var(--border);border-radius:3px;background:#fff;flex:none"></span>`;
