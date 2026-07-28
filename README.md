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
   The **issuer** is the short `user:12345678:123` string and is always visible on that page.
   The **secret** is 64 hex characters and is shown only once. Note that Mozilla calls the
   issuer the "API key", so `WEB_EXT_API_KEY` wants the *short* one — swapping them is the
   easiest mistake to make here, and `npm run sign` checks for it before doing anything.

2. Store them for good:

   ```powershell
   [Environment]::SetEnvironmentVariable('WEB_EXT_API_KEY', 'user:12345678:123', 'User')
   [Environment]::SetEnvironmentVariable('WEB_EXT_API_SECRET', '<64 hex chars>', 'User')
   ```

   On Windows the signing script reads these straight from the registry if the shell doesn't
   have them, so you don't need to restart your terminal app. (Windows Terminal and VS Code
   snapshot the environment when the *application* launches — a new tab inherits the stale
   copy, which is why "open a new terminal" often isn't enough.)

   Check them any time with `npm run sign:check`, which validates and stops.

3. `npm run sign` — builds, uploads, waits for automated review, and writes a signed `.xpi` to
   `.output/signed/`.
4. `about:addons` → gear icon → **Install Add-on From File…** → pick that `.xpi`.

### Shipping an update

The manifest carries an `update_url`, so Firefox updates itself once a release is published —
no reinstalling. It polls roughly daily; `about:addons` → gear → *Check for Updates* forces it.

1. Bump `version` in `package.json`. AMO rejects a repeat upload of the same version.
2. `npm run sign` — signs, then regenerates `updates.json` for the new version. It refuses to
   write the manifest if no signed `.xpi` for that version exists, so it can't publish a link
   to a file that isn't there.
3. Publish both — the two commands are printed by step 2:

   ```bash
   gh release create v1.1.0 ".output/signed/<name>.xpi" --title "v1.1.0" --notes ""
   ```

   then commit and push `updates.json`.

**The repo must stay public.** Firefox fetches `updates.json` and the `.xpi` anonymously; making
the repo private turns both into 404s and updates stop happening silently.

Changing the `update_url` later means re-signing and one final manual reinstall, since that field
is part of what gets signed.

## How it's built

WXT + Svelte 5 + TypeScript, Manifest V3, data in IndexedDB via Dexie.

| Path | Role |
|---|---|
| `entrypoints/popup/` | Capture with editable confirmation |
| `entrypoints/dashboard/` | Full management UI — filters, views, editing, bulk actions |
| `entrypoints/background.ts` | Context menus, keyboard shortcut, badge |
| `src/capture.ts` | Pulls the page's markup back in one injected call |
| `src/ui/catScene.ts` | The cats' idle behaviour, as testable pure logic |
| `src/extract/` | JSON-LD → microdata → OpenGraph → Twitter → DOM heuristics |
| `src/domain/` | Pure filter, sort and visibility logic |
| `src/data/` | Dexie schema, queries, mutations, backup |
| `src/ui/tokens.css` | Four palettes: person A/B × light/dark |
| `src/ui/effects.css` | Keyframes, themed decoration, reduced-motion opt-out |
| `src/ui/icons.ts` | The SVG icon set, drawn on a 24×24 grid |
| `assets/logo.svg` | Extension logo — the source for `public/icon/*.png` |

The icon PNGs are generated, never hand-edited. Change `assets/logo.svg`, then
`npm run icons:preview` — it regenerates all five sizes and writes a magnified sheet of
16/32/48 on both light and dark toolbar greys to `.output/icon-preview.png`. Check the 16px
tile: that is the toolbar button, and it is where a logo that looks fine at 128 falls apart.

There are no emoji anywhere in the UI. Every icon is an SVG path in `icons.ts` rendered through
`Icon.svelte`, so it inherits `currentColor` and looks identical on every machine — emoji would
stay glossy full-colour inside the flat pastel and terminal-blue palettes. A category stores an
icon *name* (`'laptop'`), not a glyph; unknown names fall back to the box icon, so a backup written
by another version can't render a hole.

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
build hook in `wxt.config.ts` fails the build if a host permission ever reappears.

Capture is one `scripting.executeScript` call that returns the page's markup, which is then parsed
here. There is no content script: the earlier messaging version could fail silently and fall back
to just the tab title, with no price and no image.

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
