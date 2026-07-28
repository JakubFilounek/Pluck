<script lang="ts">
  import { captureActiveTab } from '@/src/capture';
  import { seedDefaults } from '@/src/data/db';
  import { createItem, deleteItem } from '@/src/data/mutations';
  import { findDuplicate, listCategories, listTags } from '@/src/data/queries';
  import { formatPrice, parsePrice } from '@/src/extract';
  import { otherPerson, loadSettings, saveSettings, type Settings } from '@/src/settings';
  import PersonToggle from '@/src/ui/PersonToggle.svelte';
  import TagChip from '@/src/ui/TagChip.svelte';
  import WantStars from '@/src/ui/WantStars.svelte';
  import CatScene from '@/src/ui/CatScene.svelte';
  import Icon from '@/src/ui/Icon.svelte';
  import TechScene from '@/src/ui/TechScene.svelte';
  import ThemeBackdrop from '@/src/ui/ThemeBackdrop.svelte';
  import { applyAppearance } from '@/src/ui/theme';
  import type { CaptureCandidate, Category, Item, Tag, WantLevel } from '@/src/domain/types';

  /**
   * Capture flow. The extracted data is shown as an editable form rather than saved
   * straight away — extraction is a best guess, and a wrong guess should cost one
   * edit here instead of becoming a bad row you find months later.
   */

  type Phase = 'loading' | 'ready' | 'saved' | 'removed' | 'error';

  let phase = $state<Phase>('loading');
  let message = $state('');
  /** Non-empty when something failed; always shown rather than swallowed. */
  let failure = $state('');
  let busy = $state(false);
  let settings = $state<Settings | null>(null);
  let candidate = $state<CaptureCandidate | null>(null);
  let categories = $state<Category[]>([]);
  let tags = $state<Tag[]>([]);
  /**
   * The already-saved copy of this page, if the current person can see one. A copy
   * that is a gift for them stays invisible here — see findDuplicate.
   */
  let existing = $state<Item | null>(null);

  // Editable form state, seeded from the capture.
  let title = $state('');
  let priceText = $state('');
  let categoryId = $state<string | undefined>(undefined);
  let selectedTags = $state<string[]>([]);
  let want = $state<WantLevel>(0);
  let giftFor = $state<'' | 'a' | 'b'>('');
  let notes = $state('');
  let showNotes = $state(false);

  let cleanupTheme = () => {};

  $effect(() => {
    void initialise();
    return () => cleanupTheme();
  });

  /** Turns anything thrown into a readable line instead of a silent no-op. */
  function describe(error: unknown): string {
    if (error instanceof Error) return `${error.name}: ${error.message}`;
    return String(error);
  }

  async function initialise() {
    try {
      const loaded = await loadSettings();
      settings = loaded;
      cleanupTheme = applyAppearance(loaded.theme, loaded.activePerson);

      await seedDefaults();
      [categories, tags] = await Promise.all([listCategories(), listTags()]);

      const result = await captureActiveTab(loaded.defaultCurrency);

      if (!result.ok) {
        phase = 'error';
        message = result.reason;
        return;
      }

      candidate = result.candidate;
      title = result.candidate.title;
      priceText = result.candidate.price?.raw ?? '';
      notes = result.candidate.notes ?? '';

      await refreshExisting();
      phase = 'ready';
    } catch (error) {
      phase = 'error';
      message = 'Pluck could not read this page.';
      failure = describe(error);
    }
  }

  async function refreshExisting() {
    if (!candidate || !settings) return;

    existing = (await findDuplicate(
      { viewer: settings.activePerson, surpriseMode: settings.surpriseMode },
      candidate.canonicalUrl,
    )) ?? null;
  }

  async function switchPerson(person: 'a' | 'b') {
    settings = await saveSettings({ activePerson: person });
    // Repaint immediately: the whole palette and motif follow the active person.
    cleanupTheme();
    cleanupTheme = applyAppearance(settings.theme, person);
  }

  function toggleTag(tagId: string) {
    selectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter((id) => id !== tagId)
      : [...selectedTags, tagId];
  }

  async function save() {
    if (!candidate || !settings || busy) return;

    busy = true;
    failure = '';

    try {
      await createItem({
        candidate: {
          ...candidate,
          title: title.trim() || candidate.title,
          // Re-parse rather than keeping the original: the user may have corrected a
          // mis-detected price by hand.
          price: parsePrice(priceText, settings.defaultCurrency),
        },
        addedBy: settings.activePerson,
        want: want || undefined,
        categoryId,
        tagIds: selectedTags,
        giftFor: giftFor || undefined,
        notes: notes.trim() || undefined,
      });

      // Fire and forget: the badge refresh is cosmetic, and a message failing must
      // not block or error the save that already succeeded.
      browser.runtime.sendMessage({ type: 'pluck:items-changed' }).catch(() => {});

      phase = 'saved';
      message = `Added to ${settings.personNames[settings.activePerson]}'s list.`;
      setTimeout(() => window.close(), 900);
    } catch (error) {
      // Previously this rejected into nothing and the button simply looked dead.
      failure = `Could not add it — ${describe(error)}`;
    } finally {
      busy = false;
    }
  }

  /** Removes the already-saved copy, putting the popup back into add mode. */
  async function removeExisting() {
    if (!existing || busy) return;

    busy = true;
    failure = '';

    try {
      await deleteItem(existing.id);
      browser.runtime.sendMessage({ type: 'pluck:items-changed' }).catch(() => {});

      existing = null;
      phase = 'removed';
      message = 'Removed. You can add it again below.';
      setTimeout(() => {
        if (phase === 'removed') phase = 'ready';
      }, 1400);
    } catch (error) {
      failure = `Could not remove it — ${describe(error)}`;
    } finally {
      busy = false;
    }
  }

  async function openDashboard() {
    await browser.runtime.sendMessage({ type: 'pluck:open-dashboard' }).catch(() => {});
    window.close();
  }

  const otherName = $derived(
    settings ? settings.personNames[otherPerson(settings.activePerson)] : 'them',
  );
  const previewPrice = $derived(
    settings ? formatPrice(parsePrice(priceText, settings.defaultCurrency)) : '',
  );
</script>

<main>
  {#if settings}
    <ThemeBackdrop person={settings.activePerson} />
  {/if}

  <header class="spread">
    <div class="row">
      <span class="mark">
        Pluck{#if settings?.activePerson === 'a'}<i class="tech-caret caret">_</i>{/if}
      </span>
    </div>
    {#if settings}
      <PersonToggle
        active={settings.activePerson}
        names={settings.personNames}
        onchange={switchPerson}
      />
    {/if}
  </header>

  {#if phase === 'loading'}
    <p class="muted pad">Reading this page…</p>
  {:else if phase === 'error'}
    <div class="pad stack">
      <p>{message}</p>
      {#if failure}<p class="failure">{failure}</p>{/if}
      <button class="btn" onclick={openDashboard}>Open dashboard</button>
    </div>
  {:else if phase === 'saved'}
    <div class="pad done">
      <span class="tick"><Icon name="check" size={30} weight={2.4} /></span>
      <p>{message}</p>
    </div>
  {:else if candidate}
    <div class="capture">
      {#if existing}
        <!-- Already saved. Stated up front with a filled green check, because the
             thing you most need to know here is "don't add this twice". -->
        <div class="intro row">
          <span class="check-badge"><Icon name="check" size={13} weight={3} /></span>
          <div class="min">
            <h1>Already added</h1>
            <p class="muted truncate">
              on {new Date(existing.createdAt).toLocaleDateString()}
              {#if existing.giftFor && settings}
                · gift for {settings.personNames[existing.giftFor]}
              {/if}
            </p>
          </div>
        </div>
      {:else}
        <!-- Say plainly what is about to happen. "Save" on its own read as saving
             something generic rather than adding this page as an item. -->
        <div class="intro">
          <h1>Add this product</h1>
          <p class="muted truncate">
            from <strong>{candidate.site}</strong> · check the details, then add it
          </p>
        </div>
      {/if}

      {#if phase === 'removed'}
        <p class="notice">{message}</p>
      {/if}

      {#if failure}
        <p class="failure">{failure}</p>
      {/if}

      {#if candidate.source === 'fallback'}
        <p class="notice">
          Couldn't read this page's details — only its title and link came through. Fill in
          anything you want by hand below.
        </p>
      {/if}

      {#if candidate.imageUrl}
        <img class="preview" src={candidate.imageUrl} alt="" />
      {:else}
        <!-- No product image on the page: show the person's motif instead of an
             apologetic grey box. Static here — a moving scene next to a form is noise. -->
        <div class="preview empty">
          {#if settings?.activePerson === 'a'}
            <TechScene width={220} still />
          {:else}
            <CatScene width={230} still />
          {/if}
        </div>
      {/if}

      <div class="fields">
        <div>
          <label for="title">Title</label>
          <input id="title" bind:value={title} />
        </div>

        <div class="two">
          <div>
            <label for="price">Price {previewPrice ? `· ${previewPrice}` : ''}</label>
            <input id="price" bind:value={priceText} placeholder="not detected" />
          </div>
          <div>
            <label for="category">Category</label>
            <select id="category" bind:value={categoryId}>
              <option value={undefined}>—</option>
              {#each categories as category (category.id)}
                <!-- A native <option> can only hold text, so no icon here. -->
                <option value={category.id}>{category.name}</option>
              {/each}
            </select>
          </div>
        </div>

        <div>
          <label for="want-stars">How much do you want it?</label>
          <div id="want-stars">
            <WantStars value={want} label="Want level" onchange={(value) => (want = value)} />
          </div>
        </div>

        <div>
          <span class="field-label">Tags</span>
          <div class="tags">
            {#each tags as tag (tag.id)}
              <TagChip
                {tag}
                selected={selectedTags.includes(tag.id)}
                onclick={() => toggleTag(tag.id)}
              />
            {/each}
          </div>
        </div>

        <div>
          <label for="gift">Gift for</label>
          <select id="gift" bind:value={giftFor}>
            <option value="">Nobody — it's for us</option>
            {#if settings}
              <option value={otherPerson(settings.activePerson)}>
                {otherName} (hidden from them)
              </option>
              <option value={settings.activePerson}>
                {settings.personNames[settings.activePerson]}
              </option>
            {/if}
          </select>
        </div>

        {#if showNotes}
          <div>
            <label for="notes">Notes</label>
            <textarea id="notes" bind:value={notes}></textarea>
          </div>
        {:else}
          <button class="btn btn-ghost btn-sm" onclick={() => (showNotes = true)}>
            + Add a note
          </button>
        {/if}
      </div>
    </div>

    <footer class="spread">
      <button class="btn btn-ghost btn-sm" onclick={openDashboard}>
        All items <Icon name="arrowRight" size={13} weight={2} />
      </button>
      {#if existing}
        <button class="btn add added" onclick={removeExisting} disabled={busy}>
          <Icon name="check" size={15} weight={2.4} />
          Added — click to remove
        </button>
      {:else}
        <button class="btn btn-primary add" onclick={save} disabled={busy}>
          <Icon name="plus" size={15} weight={2.2} />
          Add to {settings ? settings.personNames[settings.activePerson] : 'my'} list
        </button>
      {/if}
    </footer>
  {/if}
</main>

<style>
  main {
    width: 380px;
    max-height: 580px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    z-index: 1;
  }

  header {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--surface) 86%, transparent);
    backdrop-filter: blur(10px);
  }

  .mark {
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--accent);
  }

  .caret {
    font-style: normal;
    font-family: var(--font-numeric);
  }

  .pad {
    padding: 16px 12px;
  }

  .capture {
    padding: 12px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .intro h1 {
    font-size: 15px;
  }

  .intro p {
    margin: 2px 0 0;
    font-size: 12px;
  }

  .notice {
    margin: 0;
    padding: 7px 9px;
    font-size: 11.5px;
    line-height: 1.4;
    color: var(--text);
    background: var(--accent-soft);
    border: 1px solid var(--accent-ghost);
    border-radius: var(--radius-sm);
  }

  .add {
    font-weight: 600;
  }

  .added {
    background: var(--ok);
    border-color: var(--ok);
    color: #fff;
  }

  .added:hover:not(:disabled) {
    filter: brightness(1.08);
    background: var(--ok);
  }

  /* Filled green disc with a white tick — reads as "done" at a glance. */
  .check-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--ok);
    color: #fff;
    flex-shrink: 0;
  }

  .min {
    min-width: 0;
  }

  .failure {
    margin: 0;
    padding: 7px 9px;
    font-size: 11.5px;
    line-height: 1.4;
    color: var(--danger);
    background: color-mix(in srgb, var(--danger) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--danger) 35%, transparent);
    border-radius: var(--radius-sm);
    word-break: break-word;
  }

  .preview {
    width: 100%;
    height: 130px;
    object-fit: contain;
    background: var(--surface-2);
    border-radius: var(--radius);
    border: 1px solid var(--border);
  }

  .preview.empty {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-dim);
    font-size: 12px;
    height: 150px;
  }

  .fields {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  footer {
    padding: 10px 12px;
    border-top: 1px solid var(--border);
    background: var(--surface);
  }

  .done {
    text-align: center;
  }

  .tick {
    display: inline-flex;
    color: var(--ok);
  }

</style>
