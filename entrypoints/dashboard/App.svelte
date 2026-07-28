<script lang="ts">
  import { backupIsStale, downloadBackup } from '@/src/data/backup';
  import { seedDefaults } from '@/src/data/db';
  import {
    bulkAddTag,
    bulkAddToList,
    bulkSetCategory,
    bulkSetStatus,
    setWant,
  } from '@/src/data/mutations';
  import {
    listCategories,
    listLists,
    listSites,
    listTags,
    listUsage,
    queryItems,
    tagUsage,
  } from '@/src/data/queries';
  import { DEFAULT_FILTERS, type ItemFilters } from '@/src/domain/filters';
  import { SORT_LABELS, type SortMode } from '@/src/domain/sort';
  import {
    ITEM_STATUSES,
    type Category,
    type Item,
    type ItemStatus,
    type PersonId,
    type PluckList,
    type Tag,
    type WantLevel,
  } from '@/src/domain/types';
  import { formatPrice } from '@/src/extract/price';
  import { loadSettings, otherPerson, saveSettings, watchSettings, type Settings } from '@/src/settings';
  import ItemCard from '@/src/ui/ItemCard.svelte';
  import ItemDrawer from '@/src/ui/ItemDrawer.svelte';
  import ItemRow from '@/src/ui/ItemRow.svelte';
  import PersonToggle from '@/src/ui/PersonToggle.svelte';
  import SettingsDialog from '@/src/ui/SettingsDialog.svelte';
  import TagChip from '@/src/ui/TagChip.svelte';
  import WantStars from '@/src/ui/WantStars.svelte';
  import CatScene from '@/src/ui/CatScene.svelte';
  import Icon from '@/src/ui/Icon.svelte';
  import TechScene from '@/src/ui/TechScene.svelte';
  import ThemeBackdrop from '@/src/ui/ThemeBackdrop.svelte';
  import ThemeTransition from '@/src/ui/ThemeTransition.svelte';
  import { applyAppearance } from '@/src/ui/theme';

  let settings = $state<Settings | null>(null);
  let items = $state<Item[]>([]);
  let categories = $state<Category[]>([]);
  let tags = $state<Tag[]>([]);
  let sites = $state<string[]>([]);
  let usage = $state<Map<string, number>>(new Map());
  let lists = $state<PluckList[]>([]);
  let listCounts = $state<Map<string, number>>(new Map());
  let totalCount = $state(0);

  let filters = $state<ItemFilters>({ ...DEFAULT_FILTERS });
  let sort = $state<SortMode>('want-combined');
  let selected = $state<Set<string>>(new Set());
  let openItemId = $state<string | null>(null);
  let showSettings = $state(false);
  let dismissedBackupNag = $state(false);

  let cleanupTheme = () => {};
  let cleanupSettings = () => {};

  $effect(() => {
    void boot();

    return () => {
      cleanupTheme();
      cleanupSettings();
    };
  });

  async function boot() {
    await seedDefaults();
    settings = await loadSettings();
    cleanupTheme = applyAppearance(settings.theme, settings.activePerson);

    // The person toggle can be flipped from the popup, and both surprise mode and the
    // whole palette depend on it — so the dashboard follows the setting rather than
    // caching its own copy.
    cleanupSettings = watchSettings(async (next) => {
      settings = next;
      cleanupTheme();
      cleanupTheme = applyAppearance(next.theme, next.activePerson);
      await refresh();
    });

    await refresh();
  }

  async function refresh() {
    if (!settings) return;

    const ctx = { viewer: settings.activePerson, surpriseMode: settings.surpriseMode };

    [items, categories, tags, sites, usage, lists, listCounts] = await Promise.all([
      queryItems(ctx, filters, sort),
      listCategories(),
      listTags(),
      listSites(ctx),
      tagUsage(ctx),
      listLists(settings.activePerson),
      listUsage(ctx),
    ]);

    // Drop any list filter pointing at a list this person can no longer see — for
    // instance after switching person with a private list selected.
    const visibleListIds = new Set(lists.map((entry) => entry.id));
    if (filters.listIds.some((id) => !visibleListIds.has(id))) {
      filters.listIds = filters.listIds.filter((id) => visibleListIds.has(id));
    }

    // Count everything visible, ignoring filters, so the backup nag and the empty
    // state can tell "no items yet" apart from "nothing matches this filter".
    totalCount = (await queryItems(ctx, { ...DEFAULT_FILTERS, statuses: [] })).length;

    // Drop selections that the current filter no longer shows, so a bulk action can
    // never hit something off-screen.
    const visible = new Set(items.map((item) => item.id));
    selected = new Set([...selected].filter((id) => visible.has(id)));

    // Cosmetic badge refresh — never let a failed message break the render.
    browser.runtime.sendMessage({ type: 'pluck:items-changed' }).catch(() => {});
  }

  async function switchPerson(person: PersonId) {
    settings = await saveSettings({ activePerson: person });
    cleanupTheme();
    cleanupTheme = applyAppearance(settings.theme, person);
    await refresh();
  }

  async function setViewMode(viewMode: Settings['viewMode']) {
    settings = await saveSettings({ viewMode });
  }

  function toggleStatus(status: ItemStatus) {
    filters.statuses = filters.statuses.includes(status)
      ? filters.statuses.filter((value) => value !== status)
      : [...filters.statuses, status];
    void refresh();
  }

  function toggleList(id: string) {
    filters.listIds = filters.listIds.includes(id)
      ? filters.listIds.filter((value) => value !== id)
      : [...filters.listIds, id];
    void refresh();
  }

  function toggleCategory(id: string) {
    filters.categoryIds = filters.categoryIds.includes(id)
      ? filters.categoryIds.filter((value) => value !== id)
      : [...filters.categoryIds, id];
    void refresh();
  }

  function toggleTagFilter(id: string) {
    filters.tagIds = filters.tagIds.includes(id)
      ? filters.tagIds.filter((value) => value !== id)
      : [...filters.tagIds, id];
    void refresh();
  }

  function resetFilters() {
    filters = { ...DEFAULT_FILTERS };
    void refresh();
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    selected = next;
  }

  function selectAll() {
    selected = selected.size === items.length ? new Set() : new Set(items.map((item) => item.id));
  }

  async function rate(id: string, person: PersonId, value: WantLevel) {
    await setWant(id, person, value);
    await refresh();
  }

  async function bulk(action: () => Promise<void>) {
    await action();
    selected = new Set();
    await refresh();
  }

  const openItem = $derived(items.find((item) => item.id === openItemId) ?? null);
  const categoryById = $derived(new Map(categories.map((category) => [category.id, category])));
  const activeFilterCount = $derived(
    filters.categoryIds.length +
      filters.tagIds.length +
      filters.listIds.length +
      filters.sites.length +
      (filters.search ? 1 : 0) +
      (filters.minWant > 0 ? 1 : 0) +
      (filters.addedBy ? 1 : 0) +
      (filters.priceMin !== undefined || filters.priceMax !== undefined ? 1 : 0),
  );
  const showBackupNag = $derived(
    settings ? !dismissedBackupNag && backupIsStale(settings, totalCount) : false,
  );
  const totalValue = $derived(
    items
      .filter((item) => item.status === 'wanted' && item.price)
      .reduce((sum, item) => sum + (item.price?.amount ?? 0), 0),
  );
</script>

{#if settings}
  <ThemeBackdrop person={settings.activePerson} />
  <ThemeTransition person={settings.activePerson} />

  <div class="shell">
    <header class="topbar">
      <div class="row">
        <span class="mark">
          Pluck{#if settings.activePerson === 'a'}<i class="tech-caret caret">_</i>{:else}<i
              class="whiskers"><Icon name="paw" size={12} /></i
            >{/if}
        </span>
        <span class="muted count">zobrazeno {items.length}</span>
      </div>

      <input
        class="search"
        type="search"
        placeholder="Hledat v názvu, značce, obchodu, poznámkách…"
        bind:value={filters.search}
        oninput={refresh}
        aria-label="Hledat položky"
      />

      <div class="row">
        <PersonToggle
          active={settings.activePerson}
          names={settings.personNames}
          onchange={switchPerson}
        />
        <div class="seg" role="group" aria-label="Zobrazení">
          <button
            class="seg-btn"
            class:on={settings.viewMode === 'grid'}
            aria-pressed={settings.viewMode === 'grid'}
            aria-label="Dlaždice"
            onclick={() => setViewMode('grid')}
          >
            <Icon name="grid" size={15} />
          </button>
          <button
            class="seg-btn"
            class:on={settings.viewMode === 'list'}
            aria-pressed={settings.viewMode === 'list'}
            aria-label="Seznam"
            onclick={() => setViewMode('list')}
          >
            <Icon name="list" size={15} />
          </button>
        </div>
        <select bind:value={sort} onchange={refresh} aria-label="Řadit podle" class="sort">
          {#each Object.entries(SORT_LABELS) as [value, label] (value)}
            <option {value}>{label}</option>
          {/each}
        </select>
        <button
          class="btn btn-ghost btn-sm"
          onclick={() => (showSettings = true)}
          aria-label="Nastavení"
        >
          <Icon name="settings" size={16} />
        </button>
      </div>
    </header>

    {#if showBackupNag}
      <div class="nag">
        <span>
          Nic se nikam nezálohuje samo.
          {settings.lastExportAt
            ? `Poslední záloha: ${new Date(settings.lastExportAt).toLocaleDateString('cs-CZ')}.`
            : 'Zatím jsi žádnou zálohu neudělal(a).'}
        </span>
        <div class="row">
          <button class="btn btn-sm" onclick={async () => { await downloadBackup(); settings = await loadSettings(); }}>
            Zálohovat teď
          </button>
          <button class="btn btn-ghost btn-sm" onclick={() => (dismissedBackupNag = true)}>
            Později
          </button>
        </div>
      </div>
    {/if}

    <div class="body">
      <aside class="sidebar">
        {#if lists.length > 0}
          <section>
            <h3>Seznamy</h3>
            {#each lists as entry (entry.id)}
              <label class="check">
                <input
                  type="checkbox"
                  checked={filters.listIds.includes(entry.id)}
                  onchange={() => toggleList(entry.id)}
                />
                <Icon name={entry.icon} size={13} weight={1.9} />
                <span class="truncate">{entry.name}</span>
                {#if entry.visibility === 'private'}
                  <span class="lock" title="Soukromý seznam — vidíš ho jen ty">
                    <Icon name="tool" size={10} weight={2} />
                  </span>
                {/if}
                <span class="muted count-badge">{listCounts.get(entry.id) ?? 0}</span>
              </label>
            {/each}
          </section>
        {/if}

        <section>
          <h3>Stav</h3>
          {#each ITEM_STATUSES as status (status)}
            <label class="check">
              <input
                type="checkbox"
                checked={filters.statuses.includes(status)}
                onchange={() => toggleStatus(status)}
              />
              {status === 'wanted' ? 'Chceme' : status === 'bought' ? 'Koupeno' : 'Už nechceme'}
            </label>
          {/each}
        </section>

        <section>
          <h3>Kategorie</h3>
          <div class="chips">
            {#each categories as category (category.id)}
              <button
                class="pill"
                class:on={filters.categoryIds.includes(category.id)}
                onclick={() => toggleCategory(category.id)}
              >
                <Icon name={category.icon} size={12} weight={1.9} />
                {category.name}
              </button>
            {/each}
          </div>
        </section>

        <section>
          <h3>
            Štítky
            <button
              class="mode"
              onclick={() => {
                filters.tagMode = filters.tagMode === 'any' ? 'all' : 'any';
                refresh();
              }}>{filters.tagMode === 'any' ? 'kterýkoli' : 'všechny'}</button
            >
          </h3>
          <div class="chips">
            {#each tags as tag (tag.id)}
              <TagChip
                {tag}
                selected={filters.tagIds.includes(tag.id)}
                count={usage.get(tag.id) ?? 0}
                onclick={() => toggleTagFilter(tag.id)}
              />
            {/each}
          </div>
        </section>

        <section>
          <h3>Chce to</h3>
          <select
            bind:value={filters.wantOf}
            onchange={refresh}
            aria-label="Podle čího hodnocení filtrovat"
          >
            <option value="either">Kdokoli z nás</option>
            <option value={settings.activePerson}>{settings.personNames[settings.activePerson]}</option>
            <option value={otherPerson(settings.activePerson)}>
              {settings.personNames[otherPerson(settings.activePerson)]}
            </option>
          </select>
          <div class="row want-row">
            <span class="muted">aspoň</span>
            <WantStars
              value={filters.minWant as WantLevel}
              label="Minimální míra zájmu"
              size="sm"
              onchange={(value) => {
                filters.minWant = value;
                refresh();
              }}
            />
          </div>
        </section>

        <section>
          <h3>Cena</h3>
          <div class="row">
            <input
              type="number"
              placeholder="od"
              value={filters.priceMin ?? ''}
              oninput={(event) => {
                filters.priceMin = event.currentTarget.value ? Number(event.currentTarget.value) : undefined;
                refresh();
              }}
              aria-label="Cena od"
            />
            <input
              type="number"
              placeholder="do"
              value={filters.priceMax ?? ''}
              oninput={(event) => {
                filters.priceMax = event.currentTarget.value ? Number(event.currentTarget.value) : undefined;
                refresh();
              }}
              aria-label="Cena do"
            />
          </div>
        </section>

        {#if sites.length > 1}
          <section>
            <h3>Obchod</h3>
            <div class="chips">
              {#each sites as site (site)}
                <button
                  class="pill"
                  class:on={filters.sites.includes(site)}
                  onclick={() => {
                    filters.sites = filters.sites.includes(site)
                      ? filters.sites.filter((value) => value !== site)
                      : [...filters.sites, site];
                    refresh();
                  }}>{site}</button
                >
              {/each}
            </div>
          </section>
        {/if}

        <section>
          <h3>Přidal(a)</h3>
          <select
            value={filters.addedBy ?? ''}
            onchange={(event) => {
              filters.addedBy = (event.currentTarget.value || undefined) as PersonId | undefined;
              refresh();
            }}
            aria-label="Filtrovat podle toho, kdo položku přidal"
          >
            <option value="">Kdokoli</option>
            <option value="a">{settings.personNames.a}</option>
            <option value="b">{settings.personNames.b}</option>
          </select>
        </section>

        {#if activeFilterCount > 0}
          <button class="btn btn-sm" onclick={resetFilters}>
            Zrušit filtry ({activeFilterCount})
          </button>
        {/if}
      </aside>

      <main class="content">
        {#if selected.size > 0}
          <div class="bulkbar card">
            <span>Vybráno: <strong>{selected.size}</strong></span>
            <div class="row wrap">
              <button class="btn btn-sm" onclick={() => bulk(() => bulkSetStatus([...selected], 'bought'))}>
                Koupeno
              </button>
              <button class="btn btn-sm" onclick={() => bulk(() => bulkSetStatus([...selected], 'dropped'))}>
                Už nechceme
              </button>
              <button class="btn btn-sm" onclick={() => bulk(() => bulkSetStatus([...selected], 'wanted'))}>
                Zpět mezi chtěné
              </button>
              <select
                aria-label="Přidat vybraným štítek"
                onchange={(event) => {
                  const tagId = event.currentTarget.value;
                  if (tagId) void bulk(() => bulkAddTag([...selected], tagId));
                  event.currentTarget.value = '';
                }}
              >
                <option value="">Přidat štítek…</option>
                {#each tags as tag (tag.id)}
                  <option value={tag.id}>{tag.name}</option>
                {/each}
              </select>
              <select
                aria-label="Přidat vybrané do seznamu"
                onchange={(event) => {
                  const listId = event.currentTarget.value;
                  if (listId) void bulk(() => bulkAddToList([...selected], listId));
                  event.currentTarget.value = '';
                }}
              >
                <option value="">Přidat do seznamu…</option>
                {#each lists as entry (entry.id)}
                  <option value={entry.id}>{entry.name}</option>
                {/each}
              </select>
              <select
                aria-label="Nastavit vybraným kategorii"
                onchange={(event) => {
                  const value = event.currentTarget.value;
                  if (value) void bulk(() => bulkSetCategory([...selected], value));
                  event.currentTarget.value = '';
                }}
              >
                <option value="">Nastavit kategorii…</option>
                {#each categories as category (category.id)}
                  <!-- Native <option> can't hold an SVG, so the select shows names only. -->
                  <option value={category.id}>{category.name}</option>
                {/each}
              </select>
              <button class="btn btn-ghost btn-sm" onclick={() => (selected = new Set())}>
                Zrušit výběr
              </button>
            </div>
          </div>
        {/if}

        {#if items.length === 0}
          <div class="empty">
            <div class="empty-art">
              {#if settings.activePerson === 'a'}
                <TechScene width={340} />
              {:else}
                <CatScene width={360} />
              {/if}
            </div>
            {#if totalCount === 0}
              <h2>Zatím tu nic není</h2>
              <p class="muted">
                Otevři stránku s produktem a klikni na ikonu Pluck, zmáčkni Ctrl+Shift+S, nebo
                klikni pravým tlačítkem a zvol „Uložit stránku do Plucku“.
              </p>
            {:else}
              <h2>Nic neodpovídá</h2>
              <p class="muted">
                Uloženo máš {totalCount} položek, ale žádná nesedí na aktuální filtry.
              </p>
              <button class="btn btn-sm" onclick={resetFilters}>Zrušit filtry</button>
            {/if}
          </div>
        {:else}
          <div class="listhead spread">
            <button class="btn btn-ghost btn-sm" onclick={selectAll}>
              {selected.size === items.length ? 'Zrušit výběr' : 'Vybrat vše'}
            </button>
            {#if totalValue > 0}
              <span class="muted">
                Chtěné položky celkem {formatPrice({
                  amount: totalValue,
                  currency: settings.defaultCurrency,
                  raw: '',
                })}
              </span>
            {/if}
          </div>

          {#if settings.viewMode === 'grid'}
            <div class="grid">
              {#each items as item, index (item.id)}
                <!-- Staggered entrance, capped at 12 steps so a long list doesn't
                     spend a visible amount of time cascading in. -->
                <div class="enter" style="animation-delay: {Math.min(index, 12) * 22}ms">
                <ItemCard
                  {item}
                  viewer={settings.activePerson}
                  personNames={settings.personNames}
                  {tags}
                  category={item.categoryId ? categoryById.get(item.categoryId) : undefined}
                  selected={selected.has(item.id)}
                  onselect={() => toggleSelect(item.id)}
                  onopen={() => (openItemId = item.id)}
                  onwant={(person, value) => rate(item.id, person, value)}
                />
                </div>
              {/each}
            </div>
          {:else}
            <div class="rows">
              {#each items as item, index (item.id)}
                <div class="enter" style="animation-delay: {Math.min(index, 12) * 18}ms">
                <ItemRow
                  {item}
                  viewer={settings.activePerson}
                  personNames={settings.personNames}
                  {tags}
                  category={item.categoryId ? categoryById.get(item.categoryId) : undefined}
                  selected={selected.has(item.id)}
                  onselect={() => toggleSelect(item.id)}
                  onopen={() => (openItemId = item.id)}
                  onwant={(person, value) => rate(item.id, person, value)}
                />
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </main>

      {#if openItem}
        <!-- Keyed on the id so opening a different item rebuilds the drawer and its
             edit buffers, instead of showing the previous item's text. -->
        {#key openItem.id}
          <ItemDrawer
            item={openItem}
            viewer={settings.activePerson}
            personNames={settings.personNames}
            {categories}
            {tags}
            {lists}
            currency={settings.defaultCurrency}
            onclose={() => (openItemId = null)}
            onchange={refresh}
          />
        {/key}
      {/if}
    </div>
  </div>

  {#if showSettings}
    <SettingsDialog
      {settings}
      {categories}
      {tags}
      {lists}
      onclose={() => (showSettings = false)}
      onchange={async () => {
        settings = await loadSettings();
        await refresh();
      }}
    />
  {/if}
{/if}

<style>
  .shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    /* Above the fixed decorative backdrop. */
    position: relative;
    z-index: 1;
  }

  .topbar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 14px;
    padding: 9px 14px;
    /* Translucent so the themed backdrop reads through the chrome. */
    background: color-mix(in srgb, var(--surface) 88%, transparent);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
  }

  .mark {
    font-weight: 700;
    font-size: 16px;
    letter-spacing: -0.02em;
    color: var(--accent);
  }

  .caret {
    font-style: normal;
    font-family: var(--font-numeric);
    margin-left: 1px;
  }

  .whiskers {
    display: inline-flex;
    margin-left: 4px;
    vertical-align: -1px;
  }

  .empty-art {
    display: flex;
    justify-content: center;
    margin-bottom: 6px;
  }

  .count {
    font-size: 12px;
  }

  .search {
    max-width: 460px;
    justify-self: center;
  }

  .sort {
    width: auto;
  }

  .seg {
    display: inline-flex;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .seg-btn {
    padding: 5px 9px;
    border: none;
    border-radius: 0;
    color: var(--text-dim);
  }

  .seg-btn.on {
    background: var(--accent-soft);
    color: var(--accent);
  }

  .nag {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 14px;
    background: var(--accent-soft);
    color: var(--text);
    font-size: 12px;
    border-bottom: 1px solid var(--border);
  }

  .body {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .sidebar {
    width: 210px;
    flex-shrink: 0;
    padding: 14px;
    border-right: 1px solid var(--border);
    background: color-mix(in srgb, var(--surface) 82%, transparent);
    backdrop-filter: blur(10px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .sidebar section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  h3 {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim);
  }

  .lock {
    display: inline-flex;
    color: var(--gift);
    flex-shrink: 0;
  }

  .count-badge {
    margin-left: auto;
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .mode {
    font-size: 10px;
    text-transform: none;
    letter-spacing: 0;
    color: var(--accent);
    padding: 0;
    border: none;
  }

  .check {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    font-weight: 400;
    color: var(--text);
    text-transform: none;
    margin: 0;
  }

  .check input {
    width: 14px;
    height: 14px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .pill {
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    border: 1px solid var(--border);
    background: var(--surface-2);
    color: var(--text-dim);
  }

  .pill.on {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent);
  }

  .want-row {
    font-size: 11px;
  }

  .content {
    flex: 1;
    padding: 14px;
    overflow-y: auto;
    min-width: 0;
  }

  .listhead {
    margin-bottom: 8px;
    font-size: 12px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 12px;
  }

  .rows {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .bulkbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 12px;
    margin-bottom: 12px;
    font-size: 13px;
    position: sticky;
    top: 0;
    z-index: 5;
  }

  .bulkbar .wrap {
    flex-wrap: wrap;
  }

  .bulkbar select {
    width: auto;
    font-size: 12px;
    padding: 4px 6px;
  }

  .empty {
    text-align: center;
    padding: 60px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  @media (max-width: 780px) {
    .topbar {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .sidebar {
      display: none;
    }
  }
</style>
