// Data layer. With `npm start` it talks to the Express + NeDB API.
// Without a server (e.g. GitHub Pages) it falls back to the seed JSON in /data
// and keeps your changes in this browser's localStorage, so the prototype still works.

let mode = null; // 'server' | 'static'
const memory = {};

async function detect() {
  if (mode) return mode;
  try {
    const r = await fetch('api/health', { cache: 'no-store' });
    mode = r.ok && (r.headers.get('content-type') || '').includes('json') ? 'server' : 'static';
  } catch {
    mode = 'static';
  }
  return mode;
}

const key = (c) => 'bridge-proto-v4:' + c;

async function loadStatic(collection) {
  if (memory[collection]) return memory[collection];
  try {
    const saved = localStorage.getItem(key(collection));
    if (saved) return (memory[collection] = JSON.parse(saved));
  } catch {}
  const r = await fetch('data/' + collection + '.json');
  memory[collection] = r.ok ? await r.json() : [];
  return memory[collection];
}
function saveStatic(collection) {
  try { localStorage.setItem(key(collection), JSON.stringify(memory[collection])); } catch {}
}
const uid = () => Math.random().toString(36).slice(2, 10);
const matches = (doc, q) => Object.entries(q || {}).every(([k, v]) => doc[k] === v);
const clone = (x) => JSON.parse(JSON.stringify(x));

export const api = {
  async mode() { return detect(); },

  async list(collection, query = {}) {
    if ((await detect()) === 'server') {
      const qs = new URLSearchParams(query).toString();
      const r = await fetch('api/' + collection + (qs ? '?' + qs : ''));
      return r.json();
    }
    const all = await loadStatic(collection);
    return clone(all.filter((d) => matches(d, query)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
  },

  async get(collection, id) {
    if ((await detect()) === 'server') {
      const r = await fetch('api/' + collection + '/' + encodeURIComponent(id));
      return r.ok ? r.json() : null;
    }
    const doc = (await loadStatic(collection)).find((d) => d._id === id);
    return doc ? clone(doc) : null;
  },

  async create(collection, doc) {
    if ((await detect()) === 'server') {
      const r = await fetch('api/' + collection, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doc) });
      return r.json();
    }
    const all = await loadStatic(collection);
    const created = { _id: doc._id || uid(), order: all.length, ...doc, createdAt: new Date().toISOString() };
    all.push(created);
    saveStatic(collection);
    return clone(created);
  },

  async update(collection, id, fields) {
    if ((await detect()) === 'server') {
      const r = await fetch('api/' + collection + '/' + encodeURIComponent(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
      return r.ok ? r.json() : null;
    }
    const all = await loadStatic(collection);
    const doc = all.find((d) => d._id === id);
    if (!doc) return null;
    Object.assign(doc, fields, { updatedAt: new Date().toISOString() });
    saveStatic(collection);
    return clone(doc);
  },

  async remove(collection, id) {
    if ((await detect()) === 'server') {
      await fetch('api/' + collection + '/' + encodeURIComponent(id), { method: 'DELETE' });
      return;
    }
    const all = await loadStatic(collection);
    const i = all.findIndex((d) => d._id === id);
    if (i >= 0) all.splice(i, 1);
    saveStatic(collection);
  },

  // Put every collection back to the seed data
  async reset() {
    if ((await detect()) === 'server') {
      await fetch('api/reset', { method: 'POST' });
      return;
    }
    for (const k of Object.keys(localStorage)) if (k.startsWith('bridge-proto-v4:')) localStorage.removeItem(k);
    for (const k of Object.keys(memory)) delete memory[k];
  },
};
