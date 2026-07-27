<script lang="ts">
  import { PERSON_IDS, type Category, type Item, type PersonId, type Tag, type WantLevel } from '../domain/types';
  import { formatPrice, parsePrice } from '../extract/price';
  import { deleteItem, markBought, setStatus, setWant, updateItem } from '../data/mutations';
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
    currency: string;
    onclose: () => void;
    onchange: () => void;
  };

  let { item, viewer, personNames, categories, tags, currency, onclose, onchange }: Props =
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

<aside class="drawer" aria-label="Item details">
  <header class="spread">
    <h2>Details</h2>
    <button class="btn btn-ghost btn-sm" onclick={onclose} aria-label="Close details">
      <Icon name="close" size={15} />
    </button>
  </header>

  <div class="scroll stack">
    {#if item.imageUrl}
      <img class="hero" src={item.imageUrl} alt="" />
    {/if}

    <div>
      <label for="d-title">Title</label>
      <input id="d-title" bind:value={title} onblur={persist} />
    </div>

    <div>
      <label for="d-price">Price {priceText ? `· ${formatPrice(parsePrice(priceText, currency))}` : ''}</label>
      <input id="d-price" bind:value={priceText} onblur={persist} placeholder="not detected" />
    </div>

    <div>
      <label for="d-category">Category</label>
      <select id="d-category" bind:value={categoryId} onchange={persist}>
        <option value={undefined}>—</option>
        {#each categories as category (category.id)}
          <!-- A native <option> can only hold text, so no icon here. -->
          <option value={category.id}>{category.name}</option>
        {/each}
      </select>
    </div>

    <div>
      <span class="field-label">Tags</span>
      <div class="tags">
        {#each tags as tag (tag.id)}
          <TagChip {tag} selected={item.tagIds.includes(tag.id)} onclick={() => toggleTag(tag.id)} />
        {/each}
      </div>
    </div>

    <div>
      <span class="field-label">Want level</span>
      <div class="wants">
        {#each PERSON_IDS as person (person)}
          <span class="truncate">{personNames[person]}</span>
          <WantStars
            value={item.want[person]}
            label="{personNames[person]} wants this"
            onchange={(value) => rate(person, value)}
          />
        {/each}
      </div>
    </div>

    <div>
      <label for="d-gift">Gift for</label>
      <select id="d-gift" bind:value={giftFor} onchange={persist}>
        <option value="">Nobody — it's for us</option>
        <option value={otherPerson(viewer)}>
          {personNames[otherPerson(viewer)]} (hidden from them)
        </option>
        <option value={viewer}>{personNames[viewer]}</option>
      </select>
      {#if giftFor === viewer}
        <p class="hint">You won't see this once you switch away and back.</p>
      {/if}
    </div>

    <div>
      <label for="d-notes">Notes</label>
      <textarea id="d-notes" bind:value={notes} onblur={persist}></textarea>
    </div>

    <div>
      <span class="field-label">Status</span>
      {#if buying}
        <div class="card sub-form stack">
          <div>
            <label for="b-who">Bought by</label>
            <select id="b-who" bind:value={boughtBy}>
              {#each PERSON_IDS as person (person)}
                <option value={person}>{personNames[person]}</option>
              {/each}
            </select>
          </div>
          <div>
            <label for="b-price">Actually paid</label>
            <input id="b-price" bind:value={boughtPriceText} />
          </div>
          <div>
            <label for="b-date">When</label>
            <input id="b-date" type="date" bind:value={boughtAt} />
          </div>
          <div class="row">
            <button class="btn btn-primary btn-sm" onclick={confirmBought}>Confirm</button>
            <button class="btn btn-sm" onclick={() => (buying = false)}>Cancel</button>
          </div>
        </div>
      {:else}
        <div class="row wrap">
          {#if item.status !== 'bought'}
            <button class="btn btn-sm" onclick={() => (buying = true)}>
              <Icon name="check" size={14} weight={2} /> Mark bought
            </button>
          {/if}
          {#if item.status !== 'dropped'}
            <button class="btn btn-sm" onclick={() => changeStatus('dropped')}>
              Don't want any more
            </button>
          {/if}
          {#if item.status !== 'wanted'}
            <button class="btn btn-sm" onclick={() => changeStatus('wanted')}>
              Back to wanted
            </button>
          {/if}
        </div>
      {/if}

      {#if item.status === 'bought' && item.boughtBy}
        <p class="hint">
          Bought by {personNames[item.boughtBy]}
          {#if item.boughtPrice}for {formatPrice(item.boughtPrice)}{/if}
          {#if item.boughtAt}on {new Date(item.boughtAt).toLocaleDateString()}{/if}.
        </p>
      {/if}
    </div>

    <div class="meta muted">
      <a class="ext" href={item.url} target="_blank" rel="noreferrer noopener">
        Open on {item.site}
        <Icon name="external" size={12} weight={2} />
      </a>
      <span>Added by {personNames[item.addedBy]} on {new Date(item.createdAt).toLocaleDateString()}</span>
      {#if item.brand}<span>Brand: {item.brand}</span>{/if}
      {#if item.availability}<span>Availability when saved: {item.availability}</span>{/if}
    </div>

    <div class="danger-zone">
      {#if confirmingDelete}
        <p class="hint">Delete permanently? "Don't want any more" keeps it recoverable.</p>
        <div class="row">
          <button class="btn btn-sm btn-danger" onclick={remove}>Delete for good</button>
          <button class="btn btn-sm" onclick={() => (confirmingDelete = false)}>Cancel</button>
        </div>
      {:else}
        <button class="btn btn-ghost btn-sm btn-danger" onclick={() => (confirmingDelete = true)}>
          Delete
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
