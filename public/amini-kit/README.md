# Amini Kit

Coded components that match the Amini design system in Figma. Use it in any Amini web project (Bridge, Cloud, GovChat PWA, prototypes) so screens look like the designs without re-deriving colours, type and spacing.

| Figma file | What the kit takes from it |
|---|---|
| 01. Amini DS Tokens | Revised DS colours (Light + Dark), spacing, radius, Geist type styles, Small Shadow effects |
| 02. Amini Icons + Flags + Currency | 90 icons as inline SVG (Material Rounded + Amini-Custom) |
| 03. Amini Main Components | Every component below, with its variants and states |

Open `index.html` for the live gallery (light/dark toggle top left). Inspect any example to copy its markup.

No build step, no dependencies. Plain CSS plus an optional ES module.

## Quick start

Copy the `amini-kit` folder into your project (or add it as a git submodule), then:

```html
<html data-theme="light">
<head>
  <link rel="stylesheet" href="amini-kit/css/amini.css">
</head>
<body class="am-root">
  <button class="am-btn">Primary</button>
  <button class="am-btn am-btn--tertiary am-btn--sm">Cancel</button>

  <script type="module">
    import { icon, toast, modal, menu, initKit } from './amini-kit/js/amini.js';
    initKit();                        // switches, tabs and tooltips
    document.body.insertAdjacentHTML('beforeend', icon('search'));
    toast('Saved', { action: 'Undo', onAction: () => {} });
  </script>
</body>
</html>
```

## What's inside

```
amini-kit/
├─ css/amini.css        ← link this one file
├─ css/tokens.css       ← design tokens (CSS variables), light + dark
├─ css/components.css   ← component classes
├─ js/amini.js          ← toast, modal, popover, menu, tooltip, theme, avatar, status
├─ js/icons.js          ← ICONS map + icon(name) → inline SVG
├─ assets/              ← Amini + Bridge logos, Geist fonts (bundled, OFL)
└─ index.html           ← gallery
```

## Tokens

All colours are CSS variables named after the Revised DS tokens, e.g. `--am-brand` (surface/brand-primary), `--am-text-support` (text/default/support), `--am-card` (surface/component-card), `--am-input-border`.

- **Dark mode:** set `data-theme="dark"` on `<html>`, or call `setTheme('dark' | 'light' | 'auto')` from `amini.js`. Use `class="am-dark"` to make one region dark, as the app sidebar does.
- **Spacing:** `--am-space-xs 2`, `s 4`, `ms 8`, `md 16`, `l 24`, `xl 32`, `xxl 40`.
- **Radius:** `--am-radius-xs 4`, `s 8`, `m 16`, `l 24`, `xl 32`, `circle 64`.
- **Shadows:** `--am-shadow` (Default-Tucked), `--am-shadow-hover`, `--am-shadow-focus`.
- **Grey or secondary text:** always use `--am-text-support`.
- **Bridge page background:** `--am-chat-surface` (surface/chat-surface: #fcfcfc light, #282828 dark).

## Layout grid (fluid 12 columns)

Figma frames are drawn at 1440px; code lays them out on a fluid 12-column grid: 32px margins and 32px gutters (24/16 below 1024px, 16/16 below 600px).

- `.am-grid` + `.am-col-1` … `.am-col-12` (and `.am-start-N`) for column layouts.
- `.am-grid-scope` on a container makes `--am-col` (one column's width) available to everything inside it; `.am-w-4/5/6/8/10` give widths of N columns. Set `--am-grid-max` on the scope to stop the grid growing past the design width.
- Bridge reading pages (Research, Brief, Skills, Settings) are 8 columns of the main area: exactly 720px at 1440. Onboarding's form is 5 columns of the viewport (555px at 1440).

## Type

Geist and Geist Mono, matching the Amini text styles:

| Class | Style | Size / line height |
|---|---|---|
| `am-h1` … `am-h6` | Amini H1–H6 (bold) | 32/38, 24/30, 20/26, 16/26, 14/22, 12/18 |
| `am-r1` … `am-r4`, `am-small` | Body Regular 1–4, Small Text | 20/30, 16/25, 14/22, 12/20, 10/14 |
| `am-m1` … `am-m4` | Body Medium 1–4 | 20/30, 16/25, 14/22, 12/20 |
| `am-hero`, `am-hero-light`, `am-highlight` | Bold Hero, Light Hero, Regular Highlight | 48/55, 48/55, 24/31 |
| `am-mono`, `am-mono-r3`, `am-mono-caps` | Amini Mono | 12/20, 14/22, 12/20 |

## Components

| Figma component | Class(es) |
|---|---|
| Button (Primary / Secondary / Tertiary / Danger, Default / Small / Mobile, Has Icon, Loading) | `am-btn` + `--secondary` `--tertiary` `--danger` `--sm` (32px) `--xs` (31px compact: Edit, Export, Configure) `--mobile` `--lead` (+ `am-btn__lead`), `.is-loading`, `:disabled` |
| Icon Only Button, Chip Button, Outline Button, Button Group | `am-icon-btn` (`--sm` `--xs` `--outline`), `am-chip-btn`, `am-outline-btn`, `am-btn-group` |
| Input / Select / Textarea / With Button / Tags | `am-field`, `am-label`, `am-input`, `am-select`, `am-textarea`, `am-input-wrap`, `am-input-tags` + `am-input-tag`, `am-help`, `am-error-text` |
| Checkbox, Radio, Amini Switch | `am-checkbox`, `am-radio`, `am-choice`, `am-switch` (`role="switch" aria-checked`) |
| Alert (Info / Warning / Danger / Success, Has Actions) | `am-alert` `--warning` `--danger` `--success`, `__icon` `__title` `__text` `__actions` `__close` |
| Data Status, Large Data Status | `am-status` `--success` `--negative` `--warning` `--info`, add `--lg` for the pill |
| Notification, toast | `am-notification` (`--danger` …), `toast()` in JS |
| Code Badge, Code Status Pill | `am-badge` `--info` `--danger` `--success` `--warning`, `--code` + `--get` `--post` `--put` `--delete` `--patch` |
| Avatar | `am-avatar` `--16` `--32` `--40` `--48`, `avatar(name, size)` in JS |
| Amini Breadcrumb | `am-breadcrumb` (current item gets `aria-current`) |
| Amini Tabs | `am-tabs` + `am-tab[aria-selected]` (add `data-tabs` for auto-switching) |
| Standard-Card, Content Slot | `am-card` (`--pad` `--flat` `--interactive`), `am-content-slot` |
| Directory: Section Title, List Item, Folder, Folder Card, File with Preview, counter | `am-dir-title`, `am-dir-item` (`.is-active` `.is-focus`), `am-dir-folder`, `am-folder-card`, `am-file` (`--failed` `--partial`), `am-file-grid`, `am-counter` |
| Document Viewer: tag, classification tag, linked document, panel | `am-tag`, `am-class-tag`, `am-linked-doc`, `am-viewer-panel` |
| Dropdown / Pop Up, row menu | `am-dropdown`, `am-dropdown__item`, `am-menu`, `am-menu__item`; `popover()` and `menu()` in JS |
| Modal Box, modal-bg | `modal({ title, iconName, body, foot, size })` in JS, or `am-scrim` + `am-modal` markup |
| Tooltip | `data-tooltip="Text"` on any element (after `initKit()`) |
| Tables v2 + footer, Pagination | `am-table` (`--zebra`, rows `.is-selected` `.is-warning`), `am-table__sub`, `am-table-foot`, `am-pagination` |
| Amini Progress Steps, progress bar | `am-steps` + `am-step` (`.is-active` `.is-done`) + `am-step__line`, `am-progress` |
| Amini Upload Box, File Uploading | `am-upload`, `am-upload-file` |
| AI Chatbox, attachments, File Source Results | `am-chatbox` (`__area` `__input` `__controls` `__tools` `__voice` `__send`), `am-attachment`, `am-source-file` |
| Information Pill, Sticky Note | `am-info-pill`, `am-sticky` (`--blue` `--neutral` `--red`) |
| Tessera Side Navigation, page template | `am-shell`, `am-sidebar am-dark`, `am-nav`, `am-nav-item` (`.is-active`), `am-nav-item__count`, `am-nav-label`, `am-profile`, `am-page` |
| Divider, empty state | `am-divider`, `am-divider-text`, `am-empty` |

## Icons

```js
import { icon, ICON_NAMES } from './amini-kit/js/icons.js';
icon('search')                       // 24px
icon('more_horiz', 'am-icon--16')    // 16px
icon('info', '', 'Information')      // labelled for screen readers
```

Icons inherit `currentColor`. Names match the Figma layer names (`chevron_right`, `more_vert`, `push_pin` …). Click any icon in the gallery to copy its name.

**To add an icon:** in Figma, select the glyph (inside `organism/icon`), use Copy as SVG, and add its `<path>` markup to `ICONS` in `js/icons.js`.

## Updating tokens from Figma

Colours are generated, never hand-edited.

1. Dump the Revised DS collection from Figma (Light mode / Dark mode, aliases resolved) into `_source/revised-ds.txt` (one `token/name=#light|#dark` per line).
2. Run `python3 _source/tools/gen_tokens.py _source/revised-ds.txt` and paste the output over the colour section of `css/tokens.css` (each `--am-*` line names its Figma token).
3. Check the gallery in both themes. Dark mode is only ever the Dark column: no `[data-theme='dark']` overrides in component or app CSS.

Keep component CSS on tokens only; don't hard-code colours.

## Rules of thumb

These follow the Amini Figma conventions:

- **Buttons:** web uses Default (48) or Small (32); PWA uses Mobile – Medium. Primary is the main action, Tertiary is the outline secondary action, Secondary is dark. Buttons are always pills.
- **Banners and callouts:** use Alert, not a custom box.
- **Paper codes:** use a neutral Code Badge (`am-badge am-badge--code`).
- **Statuses and flags:** use Data Status.
- **Shadows:** only tappable cards get one; static panels don't.

## Licence

- Fonts: Geist and Geist Mono, SIL Open Font License (`assets/fonts/OFL.txt`).
- Icons: Material Symbols, Apache 2.0.
- Everything else is internal to Amini.
