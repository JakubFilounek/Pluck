# Pluck

A local wishlist extension for Firefox, built for **two people sharing one browser profile**.

Save a product from any shop, rate how much *you personally* want it, tag it for an occasion,
and mark it bought when someone buys it. No accounts, no cloud, no sync — everything lives in
this Firefox profile.

## What it does

- **Capture** any product page with the toolbar button, `Ctrl+Shift+S`, or right-click → *Save
  this page to Pluck*. The extracted title, price, image, brand and availability are shown as an
  **editable form before saving** — a wrong guess costs one edit, not a bad row.
- **Two people, two ratings.** Every item carries a separate 0–5 want rating for each of you, so
  "how much I want it" and "how much she wants it" never get averaged into one meaningless number.
- **Surprise mode.** Flag an item as a gift for the other person and it disappears from every view
  while they're the active person — including search. You can keep each other's Christmas lists on
  the same browser.
- **Statuses.** *Wanted*, *Bought* (records who bought it, what they actually paid, and when), and
  *Not wanted any more* — which hides an item without deleting it, so it stays recoverable.
- **Organise.** Categories, coloured tags (Christmas, Birthday, Nameday, Anniversary…), filters on
  every field, grid and list views, and eight sort orders.
- **Backup.** One-click JSON export and merge-import, with a reminder when the last export is over
  a month old.
- **A theme each.** Switching the active person repaints the whole extension: person A gets a cool
  blue, tech-flavoured look — drifting circuit grid, scanline, blinking terminal caret, monitor
  emblem — and person B gets pastel pink with a black cat and a white cat with black spots, floating
  paw prints, and softer, bouncier motion. A full-screen wipe carries the incoming person's emblem
  between the two. All of it honours `prefers-reduced-motion`.

## Commands

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run check
```

`npm run dev` launches Firefox with the extension loaded and hot reload. `npm run check` runs
`svelte-check` and the test suite. `npm run build` produces `.output/firefox-mv3/`, and `npm run
zip` packages it.

## Installing it permanently in Firefox

Firefox Release refuses to install unsigned extensions — `about:debugging` works but is wiped on
restart, and the `xpinstall.signatures.required` pref does nothing on Release or Beta. The fix is
**unlisted** signing: Mozilla signs the build, but it is never published or searchable.

1. Get a JWT issuer and secret from
   [addons.mozilla.org/developers/addon/api/key](https://addons.mozilla.org/en-US/developers/addon/api/key/).
2. Put them in the environment (`web-ext` reads these names automatically, which keeps the secret
   out of your shell history):

   ```powershell
   $env:WEB_EXT_API_KEY = 'user:12345678:123'
   $env:WEB_EXT_API_SECRET = 'your-secret'
   ```

3. `npm run sign` — builds, uploads, waits for automated review, and writes a signed `.xpi` to
   `.output/signed/`.
4. `about:addons` → gear icon → **Install Add-on From File…** → pick that `.xpi`.

To ship an update: bump `version` in `package.json` (AMO rejects a repeat upload of the same
version), re-run `npm run sign`, and install the new `.xpi` over the old one. Data survives because
the extension id is unchanged. Self-distributed add-ons never auto-update.

## How it's built

WXT + Svelte 5 + TypeScript, Manifest V3, data in IndexedDB via Dexie.

| Path | Role |
|---|---|
| `entrypoints/popup/` | Capture with editable confirmation |
| `entrypoints/dashboard/` | Full management UI — filters, views, editing, bulk actions |
| `entrypoints/background.ts` | Context menus, keyboard shortcut, badge |
| `entrypoints/content.ts` | Extraction, injected on demand only |
| `src/extract/` | JSON-LD → microdata → OpenGraph → Twitter → DOM heuristics |
| `src/domain/` | Pure filter, sort and visibility logic |
| `src/data/` | Dexie schema, queries, mutations, backup |
| `src/ui/tokens.css` | Four palettes: person A/B × light/dark |
| `src/ui/effects.css` | Keyframes, themed decoration, reduced-motion opt-out |

Theming keys off two attributes on `<html>` — `data-person` (a/b) and `data-theme` (light/dark) —
both set by `applyAppearance()` in `src/ui/theme.ts`. Adding a colour means adding it to all four
blocks in `tokens.css`; nothing else hard-codes a colour.

Two design rules worth knowing before changing anything:

1. **`src/data/queries.ts` is the only read path for items.** The surprise-mode filter is applied
   there and nowhere else, so a hidden gift cannot leak through a view someone forgot to guard.
   The single deliberate exception is `exportAllItems()`, used by the backup.
2. **No LLM and no network calls.** Extraction reads only markup the page already shipped, so
   capture is instant, works offline, and sends nothing anywhere.

### Permissions

`storage`, `unlimitedStorage`, `contextMenus`, `activeTab`, `scripting` — and deliberately **no
host permissions**. Pluck can only read a page at the moment you explicitly capture from it. A
build hook in `wxt.config.ts` strips the `<all_urls>` that WXT would otherwise infer.

## Limits worth knowing

- **Surprise mode is a courtesy screen, not security.** The person toggle is one click away and
  the backup file contains everything. It prevents accidental spoilers, not deliberate snooping.
- **There is no sync.** The JSON export is the only copy of your data that exists outside this
  Firefox profile. Take one occasionally.
- **Chrome on Android cannot run extensions at all**, so there is no mobile Chrome version. Firefox
  for Android could run this via a self-hosted add-on collection; nothing in the code rules that
  out, but it hasn't been built or tested.
- Extraction can't reach pages that block script injection (`addons.mozilla.org`, PDF viewer, some
  strict-CSP sites). Those fall back to saving the tab title and URL.
