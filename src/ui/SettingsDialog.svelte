<script lang="ts">
  import { PERSON_IDS, type Category, type PersonId, type Tag } from '../domain/types';
  import { createCategory, createTag, deleteCategory, deleteTag } from '../data/mutations';
  import { downloadBackup, importBackup, type ImportResult } from '../data/backup';
  import { saveSettings, type Settings } from '../settings';
  import Icon from './Icon.svelte';
  import { CATEGORY_ICONS } from './icons';

  type Props = {
    settings: Settings;
    categories: Category[];
    tags: Tag[];
    onclose: () => void;
    onchange: () => void;
  };

  let { settings, categories, tags, onclose, onchange }: Props = $props();

  // Edit buffer for the name fields. The dialog is mounted fresh each time it opens,
  // so seeding once is correct — and not tracking the prop stops a save round-trip
  // from clobbering what is being typed.
  /* svelte-ignore state_referenced_locally */
  let names = $state({ ...settings.personNames });
  let newCategory = $state('');
  let newCategoryIcon = $state<string>('box');
  let newTag = $state('');
  let newTagColor = $state('#b4531f');
  let importMessage = $state('');
  let importError = $state('');
  let fileInput = $state<HTMLInputElement | null>(null);

  async function patch(update: Partial<Settings>) {
    await saveSettings(update);
    onchange();
  }

  async function addCategory() {
    if (!newCategory.trim()) return;
    await createCategory(newCategory.trim(), newCategoryIcon);
    newCategory = '';
    newCategoryIcon = 'box';
    onchange();
  }

  async function addTag() {
    if (!newTag.trim()) return;
    await createTag(newTag.trim(), newTagColor);
    newTag = '';
    onchange();
  }

  async function handleImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    importMessage = '';
    importError = '';

    try {
      const result: ImportResult = await importBackup(await file.text());
      importMessage = `Added ${result.itemsAdded} items (${result.itemsSkipped} already here), ${result.categoriesAdded} categories, ${result.tagsAdded} tags.`;
      onchange();
    } catch (error) {
      importError = error instanceof Error ? error.message : 'Import failed.';
    } finally {
      if (fileInput) fileInput.value = '';
    }
  }
</script>

<div
  class="backdrop"
  role="button"
  tabindex="-1"
  onclick={onclose}
  onkeydown={(event) => event.key === 'Escape' && onclose()}
>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <div
    class="panel card"
    role="dialog"
    tabindex="-1"
    aria-label="Settings"
    onclick={(e) => e.stopPropagation()}
  >
    <header class="spread">
      <h2>Settings</h2>
      <button class="btn btn-ghost btn-sm" onclick={onclose} aria-label="Close settings">
        <Icon name="close" size={15} />
      </button>
    </header>

    <div class="scroll stack">
      <section>
        <h3>Who uses this</h3>
        <div class="two">
          {#each PERSON_IDS as person (person)}
            <div>
              <label for="name-{person}">Person {person.toUpperCase()}</label>
              <input
                id="name-{person}"
                bind:value={names[person]}
                onblur={() => patch({ personNames: names })}
              />
            </div>
          {/each}
        </div>
      </section>

      <section>
        <h3>Surprise mode</h3>
        <label class="check">
          <input
            type="checkbox"
            checked={settings.surpriseMode}
            onchange={(event) => patch({ surpriseMode: event.currentTarget.checked })}
          />
          Hide gifts from the person they're meant for
        </label>
        <p class="hint">
          This is a courtesy screen, not security — the person switch at the top is one click
          away, and the backup file always contains everything. It stops accidental spoilers,
          not deliberate snooping.
        </p>
      </section>

      <section>
        <h3>Appearance</h3>
        <div class="two">
          <div>
            <label for="theme">Theme</label>
            <select
              id="theme"
              value={settings.theme}
              onchange={(event) => patch({ theme: event.currentTarget.value as Settings['theme'] })}
            >
              <option value="system">Follow system</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div>
            <label for="currency">Default currency</label>
            <input
              id="currency"
              value={settings.defaultCurrency}
              onblur={(event) => patch({ defaultCurrency: event.currentTarget.value.toUpperCase() })}
            />
          </div>
        </div>
        <p class="hint">The default is only used when a page shows a bare number with no symbol.</p>
      </section>

      <section>
        <h3>Categories</h3>
        <ul class="chips">
          {#each categories as category (category.id)}
            <li class="badge">
              <Icon name={category.icon} size={13} weight={1.9} />
              {category.name}
              <button
                class="x"
                aria-label="Delete {category.name}"
                onclick={async () => {
                  await deleteCategory(category.id);
                  onchange();
                }}
              >
                <Icon name="close" size={9} weight={2.6} />
              </button>
            </li>
          {/each}
        </ul>

        <!-- Pick from the icon set rather than typing a character: every icon here
             inherits the theme colour and looks the same on any machine. -->
        <div class="icon-picker" role="radiogroup" aria-label="Icon for the new category">
          {#each CATEGORY_ICONS as iconName (iconName)}
            <button
              type="button"
              class="icon-option"
              class:on={newCategoryIcon === iconName}
              role="radio"
              aria-checked={newCategoryIcon === iconName}
              aria-label={iconName}
              onclick={() => (newCategoryIcon = iconName)}
            >
              <Icon name={iconName} size={16} />
            </button>
          {/each}
        </div>
        <div class="add">
          <input bind:value={newCategory} placeholder="New category" />
          <button class="btn btn-sm" onclick={addCategory}>Add</button>
        </div>
        <p class="hint">Deleting a category keeps its items — they just lose the label.</p>
      </section>

      <section>
        <h3>Tags</h3>
        <ul class="chips">
          {#each tags as tag (tag.id)}
            <li class="badge" style="color: {tag.color}">
              {tag.name}
              <button
                class="x"
                aria-label="Delete {tag.name}"
                onclick={async () => {
                  await deleteTag(tag.id);
                  onchange();
                }}
              >
                <Icon name="close" size={9} weight={2.6} />
              </button>
            </li>
          {/each}
        </ul>
        <div class="add">
          <input class="color-input" type="color" bind:value={newTagColor} aria-label="Tag colour" />
          <input bind:value={newTag} placeholder="New tag" />
          <button class="btn btn-sm" onclick={addTag}>Add</button>
        </div>
      </section>

      <section>
        <h3>Backup</h3>
        <p class="hint">
          Nothing here is synced anywhere. This file is the only copy of your lists that exists
          outside this Firefox profile — and it contains everything, gifts included.
        </p>
        <div class="row">
          <button class="btn btn-sm" onclick={downloadBackup}>Export JSON</button>
          <button class="btn btn-sm" onclick={() => fileInput?.click()}>Import JSON</button>
          <input
            bind:this={fileInput}
            class="sr-only"
            type="file"
            accept="application/json,.json"
            onchange={handleImport}
          />
        </div>
        {#if settings.lastExportAt}
          <p class="hint">Last export: {new Date(settings.lastExportAt).toLocaleDateString()}</p>
        {/if}
        {#if importMessage}<p class="ok">{importMessage}</p>{/if}
        {#if importError}<p class="err">{importError}</p>{/if}
        <p class="hint">Importing merges — existing items are never overwritten or removed.</p>
      </section>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
    padding: 20px;
    border: none;
  }

  .panel {
    width: 520px;
    max-width: 100%;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    text-align: left;
    cursor: default;
  }

  header {
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
  }

  h2 {
    font-size: 15px;
  }

  h3 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim);
    margin-bottom: 8px;
  }

  .scroll {
    padding: 14px;
    overflow-y: auto;
    gap: 20px;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
    text-transform: none;
    margin: 0;
  }

  .check input {
    width: 15px;
    height: 15px;
  }

  .chips {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .x {
    display: inline-flex;
    border: none;
    padding: 0 0 0 3px;
    opacity: 0.6;
    background: none;
    line-height: 0;
  }

  .x:hover {
    opacity: 1;
    color: var(--danger);
  }

  .add {
    display: flex;
    gap: 6px;
  }

  .icon-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    padding: 6px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface-2);
  }

  .icon-option {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    color: var(--text-dim);
    border: 1px solid transparent;
  }

  .icon-option:hover {
    color: var(--text);
    background: var(--surface);
  }

  .icon-option.on {
    color: var(--accent);
    background: var(--accent-soft);
    border-color: var(--accent);
  }

  .color-input {
    width: 44px;
    padding: 2px;
  }

  .hint {
    margin: 0;
    font-size: 11px;
    color: var(--text-dim);
    line-height: 1.4;
  }

  .ok {
    margin: 0;
    font-size: 12px;
    color: var(--ok);
  }

  .err {
    margin: 0;
    font-size: 12px;
    color: var(--danger);
  }
</style>
