<script lang="ts">
  import {
    PERSON_IDS,
    type Category,
    type Item,
    type PersonId,
    type PluckList,
    type Tag,
    type WantLevel,
  } from '../domain/types';
  import { formatPrice, parsePrice } from '../extract/price';
  import {
    deleteItem,
    markBought,
    setItemInList,
    setStatus,
    setWant,
    updateItem,
  } from '../data/mutations';
  import { otherPerson } from '../settings';
  import Icon from './Icon.svelte';
  import TagChip from './TagChip.svelte';
  import WantStars from './WantStars.svelte';

  type Props = {
    item: Item;
    viewer: PersonId;
    personNames: Record<PersonId, string>;
    categories: Category[];
    tags: Tag[];
    /** Only lists the viewer may see — never the other person's private ones. */
    lists: PluckList[];
    currency: string;
    onclose: () => void;
    onchange: () => void;
  };

  let { item, viewer, personNames, categories, tags, lists, currency, onclose, onchange }: Props =
    $props();

  /**
   * One snapshot of the props, taken at mount, to seed the edit buffers below.
   *
   * The buffers deliberately do not track the props: re-syncing mid-edit would
   * overwrite half-typed text every time a background refresh lands. Opening a
   * different item remounts the component (see the {#key} in the dashboard), which
   * is what reseeds them.
   */
  /* svelte-ignore state_referenced_locally */
  const initial = {
    title: item.title,
    priceText: item.price?.raw ?? '',
    notes: item.notes ?? '',
    categoryId: item.categoryId,
    giftFor: (item.giftFor ?? '') as '' | PersonId,
    viewer,
  };

  let title = $state(initial.title);
  let priceText = $state(initial.priceText);
  let notes = $state(initial.notes);
  let categoryId = $state(initial.categoryId);
  let giftFor = $state<'' | PersonId>(initial.giftFor);
  let confirmingDelete = $state(false);

  // Mark-bought sub-form: what was actually paid is often not the listed price.
  let buying = $state(false);
  let boughtBy = $state<PersonId>(initial.viewer);
  let boughtPriceText = $state(initial.priceText);
  let boughtAt = $state(new Date().toISOString().slice(0, 10));

  async function persist() {
    await updateItem(item.id, {
      title: title.trim() || item.title,
      price: parsePrice(priceText, currency),
      notes: notes.trim() || undefined,
      categoryId,
      giftFor: giftFor || undefined,
    });
    onchange();
  }

  async function toggleTag(tagId: string) {
    const next = item.tagIds.includes(tagId)
      ? item.tagIds.filter((id) => id !== tagId)
      : [...item.tagIds, tagId];

    await updateItem(item.id, { tagIds: next });
    onchange();
  }

  async function rate(person: PersonId, value: WantLevel) {
    await setWant(item.id, person, value);
    onchange();
  }

  async function toggleList(listId: string, member: boolean) {
    await setItemInList(item.id, listId, member);
    onchange();
  }

  async function confirmBought() {
    await markBought(
      item.id,
      boughtBy,
      parsePrice(boughtPriceText, currency),
      new Date(boughtAt).toISOString(),
    );
    buying = false;
    onchange();
  }

  async function changeStatus(status: Item['status']) {
    await setStatus(item.id, status);
    onchange();
  }

  async function remove() {
    await deleteItem(item.id);
    onchange();
    onclose();
  }
</script>

<aside class="drawer" aria-label="Detail položky">
  <header class="spread">
    <h2>Detail</h2>
    <button class="btn btn-ghost btn-sm" onclick={onclose} aria-label="Zavřít detail">
      <Icon name="close" size={15} />
    </button>
  </header>

  <div class="scroll stack">
    {#if item.imageUrl}
      <img class="hero" src={item.imageUrl} alt="" />
    {/if}

    <div>
      <label for="d-title">Název</label>
      <input id="d-title" bind:value={title} onblur={persist} />
    </div>

    <div>
      <label for="d-price">Cena {priceText ? `· ${formatPrice(parsePrice(priceText, currency))}` : ''}</label>
      <input id="d-price" bind:value={priceText} onblur={persist} placeholder="nenalezena" />
    </div>

    <div>
      <label for="d-category">Kategorie</label>
      <select id="d-category" bind:value={categoryId} onchange={persist}>
        <option value={undefined}>—</option>
        {#each categories as category (category.id)}
          <!-- A native <option> can only hold text, so no icon here. -->
          <option value={category.id}>{category.name}</option>
        {/each}
      </select>
    </div>

    <div>
      <span class="field-label">
        Seznamy{item.listIds.length === 0 ? ' — v žádném' : ` (${item.listIds.length})`}
      </span>
      <div class="lists">
        {#each lists as entry (entry.id)}
          <label class="list-row">
            <input
              type="checkbox"
              checked={item.listIds.includes(entry.id)}
              onchange={(event) => toggleList(entry.id, event.currentTarget.checked)}
            />
            <Icon name={entry.icon} size={13} weight={1.9} />
            <span class="truncate">{entry.name}</span>
            {#if entry.visibility === 'private'}
              <span class="badge">soukromý</span>
            {/if}
          </label>
        {/each}
      </div>
    </div>

    <div>
      <span class="field-label">Štítky</span>
      <div class="tags">
        {#each tags as tag (tag.id)}
          <TagChip {tag} selected={item.tagIds.includes(tag.id)} onclick={() => toggleTag(tag.id)} />
        {/each}
      </div>
    </div>

    <div>
      <span class="field-label">Míra zájmu</span>
      <div class="wants">
        {#each PERSON_IDS as person (person)}
          <span class="truncate">{personNames[person]}</span>
          <WantStars
            value={item.want[person]}
            label="{personNames[person]} — míra zájmu"
            onchange={(value) => rate(person, value)}
          />
        {/each}
      </div>
    </div>

    <div>
      <label for="d-gift">Dárek pro</label>
      <select id="d-gift" bind:value={giftFor} onchange={persist}>
        <option value="">Nikoho — je to pro nás</option>
        <option value={otherPerson(viewer)}>
          {personNames[otherPerson(viewer)]} (schová se před ní/ním)
        </option>
        <option value={viewer}>{personNames[viewer]}</option>
      </select>
      {#if giftFor === viewer}
        <p class="hint">Až přepneš na druhou osobu a zpět, sám(a) to už neuvidíš.</p>
      {/if}
    </div>

    <div>
      <label for="d-notes">Poznámka</label>
      <textarea id="d-notes" bind:value={notes} onblur={persist}></textarea>
    </div>

    <div>
      <span class="field-label">Stav</span>
      {#if buying}
        <div class="card sub-form stack">
          <div>
            <label for="b-who">Koupil(a)</label>
            <select id="b-who" bind:value={boughtBy}>
              {#each PERSON_IDS as person (person)}
                <option value={person}>{personNames[person]}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="b-price">Skutečně zaplaceno</label>
            <input id="b-price" bind:value={boughtPriceText} />
          </div>
          <div>
            <label for="b-date">Kdy</label>
            <input id="b-date" type="date" bind:value={boughtAt} />
          </div>
          <div class="row">
            <button class="btn btn-primary btn-sm" onclick={confirmBought}>Potvrdit</button>
            <button class="btn btn-sm" onclick={() => (buying = false)}>Zrušit</button>
          </div>
        </div>
      {:else}
        <div class="row wrap">
          {#if item.status !== 'bought'}
            <button class="btn btn-sm" onclick={() => (buying = true)}>
              <Icon name="check" size={14} weight={2} /> Označit jako koupené
            </button>
          {/if}
          {#if item.status !== 'dropped'}
            <button class="btn btn-sm" onclick={() => changeStatus('dropped')}>
              Už nechci
            </button>
          {/if}
          {#if item.status !== 'wanted'}
            <button class="btn btn-sm" onclick={() => changeStatus('wanted')}>
              Zpět mezi chtěné
            </button>
          {/if}
        </div>
      {/if}

      {#if item.status === 'bought' && item.boughtBy}
        <p class="hint">
          Koupil(a) {personNames[item.boughtBy]}
          {#if item.boughtPrice}za {formatPrice(item.boughtPrice)}{/if}
          {#if item.boughtAt}dne {new Date(item.boughtAt).toLocaleDateString('cs-CZ')}{/if}.
        </p>
      {/if}
    </div>

    <div class="meta muted">
      <a class="ext" href={item.url} target="_blank" rel="noreferrer noopener">
        Otevřít na {item.site}
        <Icon name="external" size={12} weight={2} />
      </a>
      <span>
        Přidal(a) {personNames[item.addedBy]}
        {new Date(item.createdAt).toLocaleDateString('cs-CZ')}
      </span>
      {#if item.brand}<span>Značka: {item.brand}</span>{/if}
      {#if item.availability}<span>Availability when saved: {item.availability}</span>{/if}
    </div>

    <div class="danger-zone">
      {#if confirmingDelete}
        <p class="hint">Smazat natrvalo? Volba „Už nechci“ ji nechá obnovitelnou.</p>
        <div class="row">
          <button class="btn btn-sm btn-danger" onclick={remove}>Nenávratně smazat</button>
          <button class="btn btn-sm" onclick={() => (confirmingDelete = false)}>Zrušit</button>
        </div>
      {:else}
        <button class="btn btn-ghost btn-sm btn-danger" onclick={() => (confirmingDelete = true)}>
          Smazat
        </button>
      {/if}
    </div>
  </div>
</aside>

<style>
  .drawer {
    width: 340px;
    flex-shrink: 0;
    border-left: 1px solid var(--border);
    background: var(--surface);
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  header {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
  }

  h2 {
    font-size: 14px;
  }

  .scroll {
    padding: 12px;
    overflow-y: auto;
    flex: 1;
  }

  .hero {
    width: 100%;
    height: 150px;
    object-fit: contain;
    background: var(--surface-2);
    border-radius: var(--radius);
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .lists {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .list-row {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12.5px;
    font-weight: 400;
    color: var(--text);
    text-transform: none;
    margin: 0;
    cursor: pointer;
    min-width: 0;
  }

  .list-row input {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    cursor: pointer;
  }

  .wants {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 8px;
    align-items: center;
    font-size: 12px;
  }

  .row.wrap {
    flex-wrap: wrap;
  }

  .sub-form {
    padding: 10px;
  }

  .hint {
    margin: 6px 0 0;
    font-size: 11px;
    color: var(--text-dim);
  }

  .meta {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 11px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }

  .ext {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    align-self: flex-start;
  }

  .danger-zone {
    padding-top: 8px;
  }
</style>
