<script lang="ts">
  import { PERSON_IDS } from '../domain/types';
  import { downloadBackup, importBackup, type ImportResult } from '../data/backup';
  import { saveSettings, type Settings } from '../settings';
  import Icon from './Icon.svelte';

  /**
   * Preferences only.
   *
   * Lists, categories and tags used to live here, which meant leaving the thing you
   * were looking at to change a label attached to it. They are managed in the
   * dashboard sidebar now, next to the items they file.
   */

  type Props = {
    settings: Settings;
    onclose: () => void;
    onchange: () => void;
  };

  let { settings, onclose, onchange }: Props = $props();

  // Edit buffer for the name fields. The dialog is mounted fresh each time it opens,
  // so seeding once is correct — and not tracking the prop stops a save round-trip
  // from clobbering what is being typed.
  /* svelte-ignore state_referenced_locally */
  let names = $state({ ...settings.personNames });
  let importMessage = $state('');
  let importError = $state('');
  let fileInput = $state<HTMLInputElement | null>(null);

  async function patch(update: Partial<Settings>) {
    await saveSettings(update);
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
          <p class="hint">
            Poslední záloha: {new Date(settings.lastExportAt).toLocaleDateString('cs-CZ')}
          </p>
        {/if}
        {#if importMessage}<p class="ok">{importMessage}</p>{/if}
        {#if importError}<p class="err">{importError}</p>{/if}
        <p class="hint">Import slučuje — stávající položky se nikdy nepřepíšou ani nesmažou.</p>
      </section>

      <section>
        <h3>Seznamy, kategorie, štítky</h3>
        <p class="hint">
          Spravují se v levém panelu přehledu — přidáš je tlačítkem + u nadpisu, smažeš křížkem.
        </p>
      </section>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20;
    padding: 20px;
    border: none;
  }

  .panel {
    width: 480px;
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
