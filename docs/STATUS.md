# Pluck — what it is, and what is wrong with it

Written 29 July 2026. Updated against **v1.6.3** after the dashboard interaction
repair and rendered browser verification.

This document is for picking the project back up later, or handing it to someone
else. It says what the extension is, how it is built, what works, and — at length,
because this is the useful part — what is broken and what has already been tried.

---

## 1. What it is

A Firefox extension for **two people sharing one browser profile** to collect
products they want.

You are on a shop page, you press the toolbar button, and the product is saved with
its title, price, image, brand and availability read straight from the page. From
then on it lives in a dashboard where both of you can rate how much *you personally*
want it, file it into lists, tag it for an occasion, and mark it bought.

Everything is local. No accounts, no server, no sync — the data lives in this one
Firefox profile and the only copy that exists anywhere else is the JSON you export.

### The ideas that shape it

- **Two people, two opinions.** Every item carries a separate 0–5 want rating per
  person. "How much I want it" and "how much she wants it" are never averaged into
  one number, because that number would mean nothing.
- **Surprises survive a shared browser.** An item marked as a gift for someone is
  hidden from that person, and a private list is visible only to its owner. Both are
  courtesy screens, not security — the person switch is one click away and the backup
  file contains everything. The settings screen says so rather than implying otherwise.
- **Nothing is saved without you seeing it.** Extraction is a best guess, so the popup
  shows an editable form first. A wrong guess costs one edit rather than becoming a
  bad row you find months later.
- **"Not wanted any more" is not deletion.** Dropped items are hidden but recoverable.

---

## 2. How it is built

| | |
|---|---|
| Framework | WXT + Svelte 5 + TypeScript, Manifest V3 |
| Storage | IndexedDB via Dexie (`pluck`, schema v2); preferences in `storage.local` |
| Distribution | Signed by Mozilla as **unlisted**, self-hosted on GitHub |
| Repo | `github.com/JakubFilounek/Pluck` — must stay **public** or updates break |
| Tests | 136, via Vitest, plus rendered dashboard interaction checks |

### Layout

```
entrypoints/popup/        capture, with an editable confirm step
entrypoints/dashboard/    the main UI: filters, views, editing, sidebar management
entrypoints/background.ts context menus, keyboard shortcut, badge
src/capture.ts            reads the page in one executeScript call
src/extract/              JSON-LD → microdata → OpenGraph → Twitter → DOM heuristics
src/domain/               pure filter, sort and visibility logic
src/data/                 Dexie schema, queries, mutations, backup
src/ui/                   shared components, palettes, the icon set, the cats
```

Two rules worth knowing before changing anything:

1. **`src/data/queries.ts` is the only read path for items.** Both visibility rules —
   gift-for and private lists — are applied there and nowhere else, so a hidden item
   cannot leak through a view someone forgot to guard. The single deliberate exception
   is `exportAllItems()`, which backs the backup and must be complete.
2. **No LLM, no network calls.** Extraction reads only markup the page already shipped.

### Permissions

`storage`, `unlimitedStorage`, `contextMenus`, `activeTab`, `scripting` — and
deliberately **no host permissions**. A build hook fails the build if one reappears.

### Releasing

```bash
npm run sign        # validates credentials, builds, signs, rewrites updates.json
gh release create vX.Y.Z ".output/signed/<name>.xpi" --title "vX.Y.Z" --notes ""
git add updates.json && git commit -m "Release vX.Y.Z" && git push
```

Release before push, or Firefox briefly fetches a manifest pointing at a 404. AMO
credentials live in the Windows user environment; `npm run sign` reads them from the
registry directly, because Windows Terminal and VS Code snapshot the environment at
launch and a new tab does not see a freshly set variable.

---

## 3. Open issues

All four are reported against **1.6.0, confirmed installed and active**. None of them
are stale-build problems.

### 3.1 Switching person leaves the other person's cats on screen — FIXED

**Symptom.** Switching Me → Her → Me leaves the cats visible on the blue/tech theme.
Reported as "her dashboard glitches mine".

**Fixed four times, still present.** Each attempt addressed a real defect:

1. `0355e39` — the dismiss timers were cleared from a Svelte effect cleanup, which
   runs on *any* re-run, not just unmount. The effect then took its early return and
   the overlay never came down.
2. `26c013e` — rebuilt the element per switch with `{#key}` and ended it on
   `animationend`.
3. `0adf8fc` — same cleanup mistake reintroduced with the failsafe timer; moved the
   timer out of the effect entirely.
4. `6906ee3` — **removed the full-screen overlay altogether**, on the reasoning that
   an element which must be actively dismissed can always fail to be dismissed. It was
   replaced by a 3px bar whose resting state is invisible and which nothing removes.

**Failure modes and fix.** Person-dependent refreshes could overlap, allowing an older
IndexedDB response to repaint after a newer switch. Refreshes now carry a generation
number and stale results are discarded. The empty-state scene is keyed by person so
the previous component and its animation timers are destroyed, and person A has a
CSS invariant that hides any stale cat art or paw nodes even during an interrupted
render. The popup now also reloads person-private lists and duplicate visibility when
its person toggle changes; previously it only repainted the palette.

The source now compiles, all tests pass, and the Firefox production build succeeds.
The final check is installing the next signed build over 1.6.0 and repeating the
switch on the real profile.

### 3.2 Opening settings freezes the dashboard — FIXED

**Symptom.** Opening the settings dialog makes the dashboard unusable; it needs a
reload.

**What was tried.** `26c013e` fixed a real layout defect — the panel was unbounded so
its content grew the dialog instead of scrolling — and `f0428bf` cut the dialog down
to preferences only, removing the effect that recounted missing defaults on every prop
change. Neither addressed a *freeze*, and the freeze is still reported.

**Root cause and fix.** The decorative page layer and the modal were both named
`.backdrop`. Shared CSS sets the decorative layer to `pointer-events: none`, and that
also matched the settings overlay. The dialog appeared but none of its controls could
receive a click, which looked exactly like a frozen dashboard. They now use separate
`theme-backdrop` and `dialog-backdrop` classes, and the latter explicitly accepts
pointer events. Settings saves no longer launch a second redundant refresh, Escape
closes the dialog reliably, errors are shown, and edited person names are copied out
of Svelte's proxy before being sent to Firefox storage.

### 3.3 Adding a product produced DataCloneError — FIXED IN 1.6.2

**Symptom.** `Could not add it — DataCloneError: Proxy object could not be cloned.`

**Status.** This is arguably progress. Until `64b1620`, `save()` awaited `createItem`
with no `catch`, so a failure left the popup untouched and the button looked dead —
which is exactly what was reported earlier. It now prints what went wrong.

**The write path itself is proven.** 11 tests drive the real Dexie stack against an
in-memory IndexedDB, including the exact argument shape the popup sends, with
`undefined` in every optional field. All pass.

**Root cause and fix.** Svelte 5 wraps reactive arrays and nested objects in Proxy
objects. The popup passed its selected tag and list arrays directly to `createItem`,
and native IndexedDB's structured-clone algorithm refuses Proxy values. All item
creates and updates now recursively materialise arrays and plain records at the data
boundary before Dexie writes them. A regression test sends real Proxy-wrapped tags,
lists and price data through the full Dexie stack.

The popup person switch also reloads private lists and surprise visibility before a
save, preventing the form from retaining a list belonging to the other person.

### 3.4 Delete controls on chips — FIXED IN 1.6.3

The delete control is absolutely positioned on the capsule's top-right corner, so
appearing on hover never moves neighbouring capsules. It deletes immediately, without
a confirmation step. List delete controls are also fixed-width and immediate.

### 3.5 Cat art stretches between poses — FIXED

The old sleeping pose compressed a standing torso to 50% height, widened it to 120%,
and crushed the legs to 20%. That was deliberate CSS but visibly looked broken. Lying
and sleeping cats now have their own curled silhouette. Movement, tail, blink and
breathing animation use translation/rotation only; the body is never distorted.

### 3.6 Dashboard filters and backup dismissal — FIXED IN 1.6.3

Filter transitions now replace state with a fresh plain snapshot before every async
query. Status selection is included in the active-filter count, and resetting creates
new nested arrays instead of reusing defaults. A rendered interaction check marked a
product `Už nechceme`, recovered it through that status filter, and reset back to the
wanted-only view. `Později` now dismisses the backup bar for the dashboard session.

### 3.7 Persistent personal themes — FIXED IN 1.6.3

The tech workstation, circuit rail and moving packets remain behind the dashboard when
products exist. The pastel theme likewise keeps the black cat and spotted white cat
moving along a bottom lane, behind content and without pointer events. The cats'
startup loop was also moved outside Svelte effect tracking; previously it could hit
Svelte's infinite-update guard and stop the partner dashboard before data loaded.

---

## 4. What is verified working

Not assumed — checked, and in most cases pinned down by tests.

- **Extraction**: 20 tests over saved product-page fixtures. Handles `@graph`, offer
  arrays, microdata in content attributes, and Czech conventions — `999,-` with no
  currency mark, `bez DPH` not mistaken for the price, `| Alza.cz` stripped from titles.
- **Price parsing**: 20 tests. `$1,299.00` and `1 299,00 Kč`, ranges, `1.299,-`.
- **List privacy**: 14 tests, including that asking for a private list by id directly
  still returns nothing, and that an item in both a shared and a private list stays
  visible to both.
- **Filters, sort, surprise mode**: includes dropped-only, all-status and clean-reset
  regression coverage.
- **The write path**: 11 tests against a real IndexedDB.
- **Settings round-trip**: 7 tests — the active person *does* persist across a reload.
- **The update chain**: verified over HTTPS after every release — `updates.json`
  returns 200 with the right version, and the `.xpi` it points at returns 200
  anonymously. Auto-update has demonstrably worked; 1.3.0 arrived that way.

---

## 5. Known limitations, by design

- **No sync, ever, as built.** The JSON export is the only off-machine copy.
- **Chrome on Android cannot run extensions at all.** Firefox for Android could, via a
  self-hosted collection; nothing rules it out but nothing has been built for it.
- **Surprise mode and private lists are courtesy screens.** The person switch is one
  click away and the backup contains everything.
- **The cats are front-facing**, so they cannot have a real walk cycle. A profile
  redraw was tried and reverted — it walked better and looked worse. Movement will
  always read as gliding.
- **Updates are manual to produce.** Every version must be signed by Mozilla and its
  release published by hand; only the *install* is automatic.

---

## 6. Honest assessment

The data and extraction layers remain well covered, and v1.6.3 closes the earlier
runtime-verification gap. The compiled dashboard was loaded with real IndexedDB data,
its controls were exercised through the rendered DOM, both themes were visually
inspected with products present, and the corrected partner dashboard produced no new
runtime warnings or errors.
