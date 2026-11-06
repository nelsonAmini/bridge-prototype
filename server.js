const express = require('express');
const fs = require('fs');
const path = require('path');
const Datastore = require('@seald-io/nedb');

const PORT = process.env.PORT || 3000;
const DB_DIR = process.env.DB_DIR || path.join(__dirname, 'db');
const SEED_DIR = path.join(__dirname, 'public', 'data');

// Every JSON file in public/data is one collection of seed documents.
const COLLECTIONS = fs
  .readdirSync(SEED_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''));

function readSeed(name) {
  return JSON.parse(fs.readFileSync(path.join(SEED_DIR, name + '.json'), 'utf8'));
}

// --reset: delete the data files so the next start reseeds from public/data
if (process.argv.includes('--reset')) {
  fs.rmSync(DB_DIR, { recursive: true, force: true });
  console.log('Database cleared. Run `npm start` to reseed from public/data.');
  process.exit(0);
}

fs.mkdirSync(DB_DIR, { recursive: true });

// One embedded NoSQL document store (MongoDB-like API) per collection, persisted to a file
const db = {};
for (const name of COLLECTIONS) {
  db[name] = new Datastore({ filename: path.join(DB_DIR, name + '.db'), autoload: true, timestampData: true });
}

async function seed(name, force) {
  const store = db[name];
  if (force) await store.removeAsync({}, { multi: true });
  if ((await store.countAsync({})) === 0) {
    await store.insertAsync(readSeed(name));
  }
}

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function store(req, res) {
  const s = db[req.params.collection];
  if (!s) res.status(404).json({ error: 'Unknown collection: ' + req.params.collection });
  return s;
}

// Simple equality filters from the query string, e.g. /api/comments?documentId=doc-cabinet
function toQuery(q) {
  const query = {};
  for (const [k, v] of Object.entries(q)) {
    if (k === 'sort' || k === 'order') continue;
    query[k] = v === 'true' ? true : v === 'false' ? false : v;
  }
  return query;
}

app.get('/api/health', (req, res) => res.json({ ok: true, collections: COLLECTIONS }));

// Reset every collection to the seed data
app.post('/api/reset', async (req, res) => {
  try {
    for (const name of COLLECTIONS) await seed(name, true);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset' });
  }
});

// List documents in a collection
app.get('/api/:collection', async (req, res) => {
  const s = store(req, res);
  if (!s) return;
  try {
    let cursor = s.findAsync(toQuery(req.query));
    const sortField = req.query.sort || 'order';
    cursor = cursor.sort({ [sortField]: req.query.order === 'desc' ? -1 : 1 });
    res.json(await cursor);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load ' + req.params.collection });
  }
});

// Get one document
app.get('/api/:collection/:id', async (req, res) => {
  const s = store(req, res);
  if (!s) return;
  const doc = await s.findOneAsync({ _id: req.params.id });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});

// Create a document
app.post('/api/:collection', async (req, res) => {
  const s = store(req, res);
  if (!s) return;
  try {
    const doc = await s.insertAsync(req.body || {});
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Update fields on a document
app.patch('/api/:collection/:id', async (req, res) => {
  const s = store(req, res);
  if (!s) return;
  try {
    const { _id, ...fields } = req.body || {};
    const { numAffected, affectedDocuments } = await s.updateAsync(
      { _id: req.params.id },
      { $set: fields },
      { returnUpdatedDocs: true }
    );
    if (!numAffected) return res.status(404).json({ error: 'Not found' });
    res.json(affectedDocuments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

// Delete a document
app.delete('/api/:collection/:id', async (req, res) => {
  const s = store(req, res);
  if (!s) return;
  const removed = await s.removeAsync({ _id: req.params.id }, {});
  if (!removed) return res.status(404).json({ error: 'Not found' });
  res.status(204).end();
});

(async () => {
  for (const name of COLLECTIONS) await seed(name, false);
  app.listen(PORT, () => {
    console.log(`Bridge prototype running on http://localhost:${PORT}`);
    console.log(`Collections: ${COLLECTIONS.join(', ')}`);
  });
})();
