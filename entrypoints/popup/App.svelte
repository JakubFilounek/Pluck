<script lang="ts">
  import { captureActiveTab } from '@/src/capture';
  import { seedDefaults } from '@/src/data/db';
  import { createItem } from '@/src/data/mutations';
  import { findDuplicate, listCategories, listTags } from '@/src/data/queries';
  import { formatPrice, parsePrice } from '@/src/extract';
  import { otherPerson, loadSettings, saveSettings, type Settings } from '@/src/settings';
  import PersonToggle from '@/src/ui/PersonToggle.svelte';
  import TagChip from '@/src/ui/TagChip.svelte';
  import WantStars from '@/src/ui/WantStars.svelte';
  import CatArt from '@/src/ui/CatArt.svelte';
  import TechArt from '@/src/ui/TechArt.svelte';
  import ThemeBackdrop from '@/src/ui/ThemeBackdrop.svelte';
  import { applyAppearance } from '@/src/ui/theme';
  import type { CaptureCandidate, Category, Item, Tag, WantLevel } from '@/src/domain/types';

  /**
   * Capture flow. The extracted data is shown as an editable form rather than saved
   * straight away — extraction is a best guess, and a wrong guess should cost one
   * edit here instead of becoming a bad row you find months later.
   */

  type Phase = 'loading' | 'ready' | 'saved' | 'duplicate' | 'error';

  let phase = $state<Phase>('loading');
  let message = $state('');
  let settings = $state<Settings | null>(null);
  let candidate = $state<CaptureCandidate | null>(null);
  let categories = $state<Category[]>([]);
  let tags = $state<Tag[]>([]);
  let duplicate = $state<Item | null>(null);

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

  async function initialise() {
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

    const existing = await findDuplicate(
      { viewer: loaded.activePerson, surpriseMode: loaded.surpriseMode },
      result.candidate.canonicalUrl,
    );

    if (existing) {
      duplicate = existing;
      phase = 'duplicate';
      return;
    }

    phase = 'ready';
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
    if (!candidate || !settings) return;

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

    // Fire and forget: the badge refresh is cosmetic, and a message failing must not
    // block or error the save that already succeeded.
    browser.runtime.sendMessage({ type: 'pluck:items-changed' }).catch(() => {});

    phase = 'saved';
    message = `Saved to ${settings.personNames[settings.activePerson]}'s list.`;
    setTimeout(() => window.close(), 900);
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
      <p class="muted">{message}</p>
      <button class="btn" onclick={openDashboard}>Open dashboard</button>
    </div>
  {:else if phase === 'saved'}
    <div class="pad done">
      <span class="tick">✓</span>
      <p>{message}</p>
    </div>
  {:else if phase === 'duplicate' && duplicate}
    <div class="pad stack">
      <p class="muted">You already saved this one.</p>
      <div class="dupe card">
        <strong class="clamp-2">{duplicate.title}</strong>
        <span class="muted">{duplicate.site}{duplicate.price ? ` · ${formatPrice(duplicate.price)}` : ''}</span>
      </div>
      <div class="row">
        <button class="btn btn-primary" onclick={openDashboard}>Open in dashboard</button>
        <button class="btn" onclick={() => (phase = 'ready')}>Save anyway</button>
      </div>
    </div>
  {:else if candidate}
    <div class="capture">
      {#if candidate.imageUrl}
        <img class="preview" src={candidate.imageUrl} alt="" />
      {:else}
        <!-- No product image on the page: show the person's motif instead of an
             apologetic grey box. -->
        <div class="preview empty">
          {#if settings?.activePerson === 'a'}
            <TechArt size={130} subtle />
          {:else}
            <CatArt size={150} subtle />
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
                <option value={category.id}>{category.icon} {category.name}</option>
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
      <button class="btn btn-ghost btn-sm" onclick={openDashboard}>All items →</button>
      <button class="btn btn-primary" onclick={save}>Save</button>
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
    font-size: 28px;
    color: var(--ok);
  }

  .dupe {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
  }
</style>
