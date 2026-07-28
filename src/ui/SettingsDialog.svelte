<script lang="ts">
  import {
    PERSON_IDS,
    type Category,
    type ListVisibility,
    type PersonId,
    type PluckList,
    type Tag,
  } from '../domain/types';
  import {
    createCategory,
    createList,
    createTag,
    deleteCategory,
    deleteList,
    deleteTag,
    updateList,
  } from '../data/mutations';
  import { missingDefaults, restoreDefaults } from '../data/db';
  import { downloadBackup, importBackup, type ImportResult } from '../data/backup';
  import { saveSettings, type Settings } from '../settings';
  import Icon from './Icon.svelte';
  import { CATEGORY_ICONS } from './icons';

  type Props = {
    settings: Settings;
    categories: Category[];
    tags: Tag[];
    lists: PluckList[];
    onclose: () => void;
    onchange: () => void;
  };

  let { settings, categories, tags, lists, onclose, onchange }: Props = $props();

  // Edit buffer for the name fields. The dialog is mounted fresh each time it opens,
  // so seeding once is correct — and not tracking the prop stops a save round-trip
  // from clobbering what is being typed.
  /* svelte-ignore state_referenced_locally */
  let names = $state({ ...settings.personNames });
  let newCategory = $state('');
  let newCategoryIcon = $state<string>('box');
  let newTag = $state('');
  let newTagColor = $state('#b4531f');
  let newList = $state('');
  let newListIcon = $state<string>('heart');
  let newListColor = $state('#db5f97');
  let newListPrivate = $state(false);
  let confirmingListDelete = $state<string | null>(null);
  let importMessage = $state('');
  let importError = $state('');
  let fileInput = $state<HTMLInputElement | null>(null);

  // How many shipped defaults have been deleted, so the restore offer can name them.
  let missingCategories = $state(0);
  let missingTags = $state(0);

  $effect(() => {
    // Re-count whenever the lists change, so the offer disappears once restored.
    void categories;
    void tags;
    void missingDefaults().then((missing) => {
      missingCategories = missing.categories.length;
      missingTags = missing.tags.length;
    });
  });

  async function restore() {
    await restoreDefaults();
    onchange();
  }

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

  async function addList() {
    if (!newList.trim()) return;

    await createList(
      newList.trim(),
      newListIcon,
      newListColor,
      newListPrivate ? 'private' : 'shared',
      // A private list belongs to whoever is using the extension right now — they are
      // the only person who will ever see it.
      settings.activePerson,
    );

    newList = '';
    newListPrivate = false;
    onchange();
  }

  async function setListVisibility(listId: string, visibility: ListVisibility) {
    await updateList(listId, { visibility });
    onchange();
  }

  async function removeList(listId: string) {
    await deleteList(listId);
    confirmingListDelete = null;
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
      importMessage = `Přidáno ${result.itemsAdded} položek (${result.itemsSkipped} už tu bylo), ${result.listsAdded} seznamů, ${result.categoriesAdded} kategorií, ${result.tagsAdded} štítků.`;
      onchange();
    } catch (error) {
      importError = error instanceof Error ? error.message : 'Import se nezdařil.';
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
    aria-label="Nastavení"
    onclick={(e) => e.stopPropagation()}
  >
    <header class="spread">
      <h2>Nastavení</h2>
      <button class="btn btn-ghost btn-sm" onclick={onclose} aria-label="Zavřít nastavení">
        <Icon name="close" size={15} />
      </button>
    </header>

    <div class="scroll stack">
      <section>
        <h3>Kdo to používá</h3>
        <div class="two">
          {#each PERSON_IDS as person (person)}
            <div>
              <label for="name-{person}">Osoba {person.toUpperCase()}</label>
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
        <h3>Režim překvapení</h3>
        <label class="check">
          <input
            type="checkbox"
            checked={settings.surpriseMode}
            onchange={(event) => patch({ surpriseMode: event.currentTarget.checked })}
          />
          Skrývat dárky před tím, komu jsou určené
        </label>
        <p class="hint">
          Tohle je jen slušnost, ne zabezpečení — přepínač osoby je nahoře na jedno kliknutí a
          záloha vždycky obsahuje všechno. Brání to náhodnému prozrazení, ne cílenému hledání.
        </p>
      </section>

      <section>
        <h3>Vzhled</h3>
        <div class="two">
          <div>
            <label for="theme">Motiv</label>
            <select
              id="theme"
              value={settings.theme}
              onchange={(event) => patch({ theme: event.currentTarget.value as Settings['theme'] })}
            >
              <option value="system">Podle systému</option>
              <option value="light">Světlý</option>
              <option value="dark">Tmavý</option>
            </select>
          </div>
          <div>
            <label for="currency">Výchozí měna</label>
            <input
              id="currency"
              value={settings.defaultCurrency}
              onblur={(event) => patch({ defaultCurrency: event.currentTarget.value.toUpperCase() })}
            />
          </div>
        </div>
        <p class="hint">Použije se jen tehdy, když je na stránce holé číslo bez měny.</p>
      </section>

      <section>
        <h3>Seznamy</h3>
        <ul class="rows">
          {#each lists as entry (entry.id)}
            <li class="list-item">
              <Icon name={entry.icon} size={14} weight={1.9} />
              <span class="truncate name">{entry.name}</span>

              <select
                class="vis"
                value={entry.visibility}
                onchange={(event) =>
                  setListVisibility(entry.id, event.currentTarget.value as ListVisibility)}
                aria-label="Viditelnost seznamu {entry.name}"
              >
                <option value="shared">sdílený</option>
                <option value="private">soukromý</option>
              </select>

              {#if confirmingListDelete === entry.id}
                <button class="btn btn-sm btn-danger" onclick={() => removeList(entry.id)}>
                  Smazat
                </button>
                <button class="btn btn-sm" onclick={() => (confirmingListDelete = null)}>
                  Zpět
                </button>
              {:else}
                <button
                  class="x"
                  aria-label="Smazat seznam {entry.name}"
                  onclick={() => (confirmingListDelete = entry.id)}
                >
                  <Icon name="close" size={10} weight={2.6} />
                </button>
              {/if}
            </li>
          {/each}
        </ul>

        {#if confirmingListDelete}
          <p class="hint">
            Smazáním seznamu se položky nesmažou — jen z něj vypadnou. Pokud nezůstanou v žádném
            jiném seznamu, uvidí je oba dva, i kdyby byl seznam soukromý.
          </p>
        {/if}

        <div class="icon-picker" role="radiogroup" aria-label="Ikona nového seznamu">
          {#each CATEGORY_ICONS as iconName (iconName)}
            <button
              type="button"
              class="icon-option"
              class:on={newListIcon === iconName}
              role="radio"
              aria-checked={newListIcon === iconName}
              aria-label={iconName}
              onclick={() => (newListIcon = iconName)}
            >
              <Icon name={iconName} size={16} />
            </button>
          {/each}
        </div>

        <div class="add">
          <input class="color-input" type="color" bind:value={newListColor} aria-label="Barva" />
          <input bind:value={newList} placeholder="Nový seznam" />
          <button class="btn btn-sm" onclick={addList}>Přidat</button>
        </div>

        <label class="check">
          <input type="checkbox" bind:checked={newListPrivate} />
          Soukromý — uvidíš ho jen ty ({settings.personNames[settings.activePerson]})
        </label>
      </section>

      <section>
        <h3>Kategorie</h3>
        <ul class="chips">
          {#each categories as category (category.id)}
            <li class="badge">
              <Icon name={category.icon} size={13} weight={1.9} />
              {category.name}
              <button
                class="x"
                aria-label="Smazat kategorii {category.name}"
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
        <div class="icon-picker" role="radiogroup" aria-label="Ikona nové kategorie">
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
          <input bind:value={newCategory} placeholder="Nová kategorie" />
          <button class="btn btn-sm" onclick={addCategory}>Přidat</button>
        </div>
        <p class="hint">Smazáním kategorie se položky nesmažou — jen přijdou o označení.</p>
      </section>

      <section>
        <h3>Štítky</h3>
        <ul class="chips">
          {#each tags as tag (tag.id)}
            <li class="badge" style="color: {tag.color}">
              {tag.name}
              <button
                class="x"
                aria-label="Smazat štítek {tag.name}"
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
          <input class="color-input" type="color" bind:value={newTagColor} aria-label="Barva štítku" />
          <input bind:value={newTag} placeholder="Nový štítek" />
          <button class="btn btn-sm" onclick={addTag}>Přidat</button>
        </div>
      </section>

      {#if missingCategories > 0 || missingTags > 0}
        <section>
          <h3>Obnovit výchozí</h3>
          <p class="hint">
            Chybí výchozí kategorie ({missingCategories}) a štítky ({missingTags}). Vrácením se nic
            z toho, co jsi přidal(a), nezmění.
          </p>
          <div class="row">
            <button class="btn btn-sm" onclick={restore}>Vrátit chybějící výchozí</button>
          </div>
        </section>
      {/if}

      <section>
        <h3>Záloha</h3>
        <p class="hint">
          Nic se nikam nesynchronizuje. Tenhle soubor je jediná kopie tvých seznamů mimo tenhle
          profil Firefoxu — a obsahuje úplně všechno, včetně dárků a soukromých seznamů.
        </p>
        <div class="row">
          <button class="btn btn-sm" onclick={downloadBackup}>Exportovat JSON</button>
          <button class="btn btn-sm" onclick={() => fileInput?.click()}>Importovat JSON</button>
          <input
            bind:this={fileInput}
            class="sr-only"
            type="file"
            accept="application/json,.json"
            onchange={handleImport}
          />
        </div>
        {#if settings.lastExportAt}
          <p class="hint">Poslední záloha: {new Date(settings.lastExportAt).toLocaleDateString('cs-CZ')}</p>
        {/if}
        {#if importMessage}<p class="ok">{importMessage}</p>{/if}
        {#if importError}<p class="err">{importError}</p>{/if}
        <p class="hint">Import slučuje — stávající položky se nikdy nepřepíšou ani nesmažou.</p>
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
    /* An explicit height rather than max-height: the panel must be a bounded flex
       container before its scroll area has anything to scroll within. */
    max-height: calc(100vh - 40px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    text-align: left;
    cursor: default;
  }

  header {
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
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
    /* flex:1 with min-height:0 is what actually lets this shrink and scroll — a flex
       child defaults to min-height:auto, so the content pushed the panel taller
       instead of overflowing into a scroll area. */
    flex: 1 1 auto;
    min-height: 0;
    overscroll-behavior: contain;
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

  .rows {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .list-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 13px;
  }

  .list-item .name {
    flex: 1;
    min-width: 0;
  }

  .vis {
    width: auto;
    font-size: 11px;
    padding: 2px 4px;
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
