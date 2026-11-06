import { api } from '../api.js';
import { icon, esc, thumb, orb, toast } from '../ui.js';
import { go } from '../app.js';

const CATS = ['All templates', 'Basic', 'Cabinet', 'Reports', 'Letters and memos', 'My templates'];

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
  return api.create('documents', { ...base, title: 'Untitled ' + tpl.name.toLowerCase(), template: tpl.kind, status: 'Draft', sections: [{ id: 's1', heading: 'Summary', body: '', placeholder: 'Start writing…' }], messages: [] });
}

export async function render({ view = 'templates' }) {
  if (view !== 'templates' && !CATS.map(slug).includes(view)) return docList(view);
  const cat = CATS.find((c) => slug(c) === view) || 'All templates';
  const tpls = await api.list('templates');
  const shown = cat === 'All templates' ? tpls : cat === 'My templates' ? [] : tpls.filter((t) => t.category === cat);
  return {
    title: 'Create',
    html: `<div class="page full"><div class="chooser">
      <aside class="chooser-rail"><div class="small muted" style="padding:0 12px 8px">Templates</div>
        ${CATS.map((c) => `<a class="menu-item ${c === cat ? 'active' : ''}" href="#/create/${c === 'All templates' ? '' : slug(c)}">${esc(c)}</a>`).join('')}</aside>
      <section class="chooser-main"><div class="chooser-body">
        <h2>Choose a template</h2>
        <div class="hero-card">${orb('lg')}<div class="grow"><b style="font-size:17px">Draft with Bridge</b><p style="opacity:.75">Describe what you need and Bridge picks the template, drafts it and cites its sources.</p></div><button class="btn primary" data-kind="Cabinet Paper">Start</button></div>
        ${shown.length ? `<div class="tpl-grid">${shown.map((t) => `<button class="tpl" data-tpl="${t._id}">${thumb(t.kind)}<b>${esc(t.name)}</b><span class="small muted" style="text-align:center">${esc(t.description)}</span></button>`).join('')}</div>`
          : `<div class="card pad stack" style="align-items:center;text-align:center;padding:48px;--gap:10px">${icon('folder', 's24')}<b>No templates yet</b><p class="muted">Save any document as a template from its ⋯ menu and it will appear here.</p></div>`}
      </div>
      <footer class="chooser-foot"><span class="grow" id="selLabel"><span class="muted">Select a template</span></span><a class="btn tertiary" href="#/create/my">Cancel</a><button class="btn primary" id="createBtn" disabled>Create</button></footer></section>
    </div></div>`,
    mount(root) {
      let chosen = null;
      root.querySelectorAll('[data-tpl]').forEach((b) => (b.onclick = () => {
        root.querySelectorAll('.tpl').forEach((x) => x.classList.toggle('selected', x === b));
        chosen = tpls.find((t) => t._id === b.dataset.tpl);
        root.querySelector('#selLabel').innerHTML = `<b>${esc(chosen.name)}</b> <span class="small muted">· ${esc(chosen.description)}</span>`;
        root.querySelector('#createBtn').disabled = false;
      }));
      root.querySelectorAll('[data-tpl]').forEach((b) => (b.ondblclick = () => root.querySelector('#createBtn').click()));
      root.querySelector('#createBtn').onclick = async () => { const d = await newDocument(chosen); go('#/create/doc/' + d._id); };
      root.querySelector('[data-kind]').onclick = async () => { const d = await newDocument(tpls.find((t) => t.kind === 'Cabinet Paper')); go('#/create/doc/' + d._id); };
    },
  };
}

const slug = (c) => c.toLowerCase().replace(/[^a-z]+/g, '-');

async function docList(view) {
  const docs = await api.list('documents');
  const list = view === 'shared' ? docs.filter((d) => d.section === 'shared') : view === 'pinned' ? docs.filter((d) => d.pinned) : docs.filter((d) => d.section === 'mine');
  const title = { my: 'My documents', shared: 'Shared with me', pinned: 'Pinned' }[view] || 'Documents';
  return {
    title,
    html: `<div class="page stack" style="--gap:20px"><div class="row"><h2 class="grow">${title}</h2><a class="btn primary" href="#/create"><span class="lead">${icon('add', 's16')}</span>New document</a></div>
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
