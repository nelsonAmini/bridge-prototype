# Bridge prototype

A clickable, coded prototype of **Amini Bridge**, built from the *Experimental Bridge* Figma file. Same stack as `person-registry`: Node + Express with an embedded NoSQL store (NeDB, MongoDB-style), and a vanilla JS front end with no build step.

## What's in it

| Area | Screens and flows |
|---|---|
| Login | Email/password with validation (password `wrong` shows the error), Microsoft SSO |
| Onboarding | 5 steps: name and look, topics, priorities, answer style, skills, then "All set" |
| Research | Home with ask bar and configurable home card, plan → working → answer thread, Daily brief |
| Directory | All Papers with viewer and Share dialog, My Papers (upload, row menu), By Ministry, KB submissions, Cabinet dates |
| Create | Template chooser, Blank flow (scripted Bridge), Cabinet paper flow (attachments → live drafting → Draft ready), comments with @mentions, @Bridge suggested edits (Accept/Reject), Bridge review against Cabinet paper rules |
| My Reviews | Folders and tags in the sidebar, collapsible status groups, paper view with iPad ink toggle, highlight/note/Ask Bridge on selection, voice note, Sign dialog |
| Skills | Skills list and suggestions, 3-step New skill, How you work (forget/confirm), Settings, Activity panel (agent card in the sidebar) |

Light/dark theme: moon button on login, or Settings → Dark mode.

## Run locally (with the database)

```bash
npm install
npm start            # http://localhost:3000
npm run reset        # wipe the database; it reseeds from public/data on next start
```

Config: `PORT` (default 3000), `DB_DIR` (default `./db`).

## Two modes

- **Server mode** (`npm start`): data lives in NeDB files under `db/`, one per collection, seeded from `public/data/*.json` on first run.
- **Static mode** (GitHub Pages, or any static host): the app detects there's no API, reads `public/data/*.json` and keeps your changes in the browser's localStorage. Settings → *Reset prototype data* (or `bridgeReset()` in the console) clears them.

## API

Generic REST over every collection in `public/data`:

```
GET    /api/health
GET    /api/:collection?field=value&sort=order&order=desc
GET    /api/:collection/:id
POST   /api/:collection
PATCH  /api/:collection/:id
DELETE /api/:collection/:id
POST   /api/reset
```

Collections: users, people, topics, briefing, threads, papers, folders, myPapers, cabinetDates, templates, documents, scripts, comments, reviewRules, reviewFolders, reviews, skills, learned, activity, recent.

## Edit the data

Change the JSON in `public/data/` (or regenerate it with `python3 scripts/build-seed.py`), then `npm run reset`. In static mode, reset the prototype data in Settings.

## Publish to GitHub Pages

1. Create a repo and push this folder to `main`.
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. The included workflow (`.github/workflows/pages.yml`) deploys `public/` on every push. The site runs in static mode.

## Notes

- The Amini logo is a placeholder (wordmark + orb). Drop the real SVG into `public/img/` and swap it in `js/ui.js → wordmark()`.
- Fonts: Geist (UI) and Tinos (document font, metric-compatible with Times New Roman), from Google Fonts.
- All AI responses are scripted. Nothing calls a model.
