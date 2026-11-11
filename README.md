# Bridge prototype

A clickable, coded prototype of **Amini Bridge**, built from the *Experimental Bridge* Figma file. Same stack as `person-registry`: Node + Express with an embedded NoSQL store (NeDB, MongoDB-style), and a vanilla JS front end with no build step.

The UI is built on the **Amini Kit** (`public/amini-kit/`): the design tokens, components and icons from the Figma libraries *01. Amini DS Tokens*, *02. Amini Icons* and *03. Amini Main Components*. Bridge-specific pieces (agent orb, document sheet, editor, reviews) live in `public/css/app.css` on top of the kit tokens.

## What's in it

| Area | Screens and flows |
|---|---|
| Login | Email/password with validation (password `wrong` shows the error), Microsoft SSO |
| Onboarding | 5 steps: name and look, topics, priorities, answer style, skills, then "All set" |
| Research | Conversation header on every chat (Research › name · Knowledge trace · Export · Share · ⋯ rename/pin/delete), Knowledge trace page (loading → map → item selected, zoom/pan/filters), Home with ask bar and configurable home card, plan → working → answer thread, Daily brief, Document panel (ask “Draft a Cabinet note” in a thread: Bridge writes it in a resizable side panel, v2 on request, close/reopen from its card, Open in Create) |
| Directory | All Papers with viewer and Share dialog, My Papers (upload, row menu), By Ministry, KB submissions, Cabinet dates |
| Create | Template chooser, Blank flow (scripted Bridge), Cabinet paper flow (attachments → live drafting → Draft ready), comments with @mentions, @Bridge suggested edits (Accept/Reject), Bridge review against Cabinet paper rules |
| Search | Sidebar “Search ⌘K” or ⌘K / Ctrl+K anywhere: palette with Recent (empty), then Ask Bridge + results grouped Papers · My Reviews · Research · Documents · People, filter tabs, ↑↓ ⏎ ⌘⏎ esc (Figma 07. Search) |
| My Reviews | Folders and tags in the sidebar, collapsible status groups, cards without status pills inside groups (plain label only in mixed lists such as Due soon), audio card for voice notes (play, waveform, length), paper view with iPad ink toggle, highlight/note/Ask Bridge on selection, voice note, Sign dialog |
| Library | Library home (search, sort), Create a library, inside a library: ask box that saves chats here, chats list, Instructions and Files panel |
| Skills | Skills list and suggestions, 3-step New skill, How you work (forget/confirm), Settings with one notification switch per type, Activity panel with Earlier today (agent card in the sidebar) |

Theme: follows the Figma file until you choose one: Login in light, every app page in dark (as the designs are presented). Switch with the moon button on login, or Settings → Dark mode.

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

Collections: libraries, traces, users, people, topics, briefing, threads, papers, folders, myPapers, cabinetDates, templates, documents, scripts, comments, reviewRules, reviewFolders, reviews, skills, learned, activity, recent.

## Edit the data

Change the JSON in `public/data/` (one file per collection), then `npm run reset`. In static mode, reset the prototype data in Settings.

## Publish to GitHub Pages

1. Create a repo and push this folder to `main`.
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. The included workflow (`.github/workflows/pages.yml`) deploys `public/` on every push. The site runs in static mode.

## What changed in this version (v4, 11 Nov 2026)

Built from the Experimental Bridge Figma frames added since v3 (pages 02. Research flow 6, 13. Library, 06. Skills and Account flows 4–5) and the Notion page *Bridge Experimental (v2 Proposal)*.

- **Conversation header** (`organism / research / conversation header`): every Research chat has a top bar. With the document panel open it spans both panels. Knowledge trace is disabled until Bridge has answered.
- **Knowledge trace** (`#/research/thread/:id/trace`, `LC / Research / Knowledge Trace`): Loading (4 steps, about 5 s; leave and a toast tells you when it's ready), Ready (53 items, 71 links at the Figma positions; zoom, fit, drag to pan, ⌘/Ctrl + scroll), Item selected (path in yellow, the rest faded, map shifts 200 left, details panel). Filters: Answer (all / one answer) and Show (Everything / Without passages). Seed data: `data/traces.json`. The links are drawn in code from the connection list rather than the Figma SVG export.
- **Library** (`#/library`, `13. Library`): home grid with search and sort, Create a library, library page with ask box, chats, Instructions and Files. Seed data: `data/libraries.json`.
- **Activity panel**: list cards as in Figma plus **Earlier today** (rows link to the item).
- **Account settings**: Language helper text, **Notifications** with one switch per type, footnote about web and mobile.
- **Kit:** seven Knowledge trace tokens added to `tokens.css` (marked block, read from Figma; the light value of `surface/on-tertiary-default` is inferred), five Material icons added to `icons.js` (lightbulb_outline, format_quote, forum, live_help, zoom_out_map). Fold both into the next token/icon regeneration.
- **Fix:** at 900 px or narrower the main pane was squeezed to 88 px (the collapsed rail column stayed); it now takes the full width.
- Saved browser data uses a new key (`bridge-proto-v4`), so this version starts from fresh seed data.

### Decisions and stand-ins (not in the designs)

- Figma placeholders "[x]" in two findings use v3's figures: backup 41 days old, 128k parcels.
- The Figma details panel uses three unbound hex colours; the prototype uses `surface/component-card`, `input/border-default` and `text/default/support`.
- Details-panel content exists in Figma only for the Auditor General paper; the other 52 items have written content following the same pattern (per type: Source, Passage, Finding, Answer, Question, Ministry or body).
- The Show filter options, empty library states, rename/delete dialogs, Export menus and the "+ Files" menu (upload, Directory, My Reviews) are prototype stand-ins.
- The library Files panel says "6 files" with four cards, as drawn.
- Opening a chat row in a library that has no conversation yet starts one from the scripted thread.

## Changes in v3 (11 Nov 2026)

- **Search** (⌘K): new palette and sidebar item, built from the Figma *07. Search* frames. Seed data: `data/searchIndex.json`.
- **My Reviews cards:** no status pill inside status groups; the detail line carries the deadline in words. Mixed lists show a plain “To sign / To read” label. Colour never carries status on its own.
- **Audio and video files:** the kit's file card (`am-file`) gains `--audio` and `--video` (Figma *Amini File with Preview*, `Media=Audio | Video`). The PAHO travel report is now an audio card.
- **Tokens re-read from Figma:** `tokens.css` regenerated from a fresh Revised DS dump (danger button colours changed in Figma: default #861d2c, hover #53241d, active #281715).
- Apple Pencil ink now uses `text/default/information`.
- Saved browser data uses a new key, so this version starts from fresh seed data.

## Notes

- **Logos and icons** are the real assets exported from Figma (Bridge Logo, Amini logo, Material icons from 02. Amini Icons).
- **Fonts are bundled** (no Google Fonts call): Geist and Geist Mono for the UI (in the kit), and Tinos for the document sheet (metric-compatible with Times New Roman).
- **Updating the kit:** replace `public/amini-kit/` with a newer copy of the `amini-kit` repo. Nothing else needs to change.
- **Matched 1:1 to Figma.** Each screen's spacing, sizes and type were read from the Figma layout data (padding, gaps, radii, text styles) rather than estimated, then checked by overlaying screenshots. Exceptions: prototype-only controls (Dark mode toggle and Reset in Settings, the login hint) and the developer ticket pills (D3, D4…) in the Directory frames, which are annotations.
- **Fluid 12-column grid:** layouts follow the kit's grid (see the kit README). The reading column is 8 of 12 columns (720px at 1440) and stops growing past the Figma width; onboarding's form is 5 columns.
- **Design-system rules:** every colour is a Revised-DS token (`amini-kit/css/tokens.css`, generated from Figma for Light and Dark mode). There are no hand-picked dark-mode colours; dark mode is the same tokens in their Dark column. The few fixed values left in `css/app.css` are commented (agent orb looks, iPad ink, KPI trend labels, Microsoft logo), as they are in the Figma library.
- **Panels:** sidebar (280, collapses to an 88px rail under 1100px) · fluid main pane on the 12-column grid · optional secondary panel (Research document panel 560, drag to resize between 400 and 60%; becomes an overlay when the main pane is too narrow). All widths live in the "Layout config" block at the top of `css/app.css`.
- **Sample data** is believable throughout (no `[x]` placeholders), even where the Figma frames still show them.
- All AI responses are scripted. Nothing calls a model.
