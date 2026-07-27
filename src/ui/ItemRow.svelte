<script lang="ts">
  import { formatPrice } from '../extract/price';
  import { otherPerson } from '../settings';
  import TagChip from './TagChip.svelte';
  import WantStars from './WantStars.svelte';
  import type { Category, Item, PersonId, Tag, WantLevel } from '../domain/types';

  type Props = {
    item: Item;
    viewer: PersonId;
    personNames: Record<PersonId, string>;
    tags: Tag[];
    category?: Category;
    selected: boolean;
    onselect: (additive: boolean) => void;
    onopen: () => void;
    onwant: (person: PersonId, value: WantLevel) => void;
  };

  let { item, viewer, personNames, tags, category, selected, onselect, onopen, onwant }: Props =
    $props();

  const theirs = $derived(otherPerson(viewer));
  const itemTags = $derived(tags.filter((tag) => item.tagIds.includes(tag.id)));
</script>

<div class="row-item" class:selected class:faded={item.status === 'dropped'}>
  <input
    class="pick"
    type="checkbox"
    checked={selected}
    onclick={(event) => onselect(event.shiftKey)}
    aria-label="Select {item.title}"
  />

  {#if item.imageUrl}
    <img class="thumb" src={item.imageUrl} alt="" loading="lazy" />
  {:else}
    <div class="thumb empty">{category?.icon ?? '📦'}</div>
  {/if}

  <div class="main">
    <button class="title truncate" onclick={onopen} title={item.title}>{item.title}</button>
    <div class="sub row">
      <span class="muted">{item.site}</span>
      {#if category}<span class="muted">· {category.name}</span>{/if}
      {#each itemTags as tag (tag.id)}
        <TagChip {tag} />
      {/each}
      {#if item.giftFor}
        <span class="badge badge-gift">🎁 {personNames[item.giftFor]}</span>
      {/if}
      {#if item.status === 'bought'}
        <span class="badge badge-bought">Bought</span>
      {:else if item.status === 'dropped'}
        <span class="badge badge-dropped">Dropped</span>
      {/if}
    </div>
  </div>

  <div class="want-cell">
    <span class="who muted truncate">{personNames[viewer]}</span>
    <WantStars
      value={item.want[viewer]}
      label="{personNames[viewer]} wants this"
      size="sm"
      onchange={(value) => onwant(viewer, value)}
    />
  </div>

  <div class="want-cell">
    <span class="who muted truncate">{personNames[theirs]}</span>
    <WantStars
      value={item.want[theirs]}
      label="{personNames[theirs]} wants this"
      size="sm"
      onchange={(value) => onwant(theirs, value)}
    />
  </div>

  <strong class="price">{formatPrice(item.price)}</strong>
</div>

<style>
  .row-item {
    display: grid;
    grid-template-columns: auto 44px 1fr auto auto 90px;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }

  .row-item.selected {
    border-color: var(--accent);
  }

  .row-item.faded {
    opacity: 0.55;
  }

  .pick {
    width: 15px;
    height: 15px;
    cursor: pointer;
  }

  .thumb {
    width: 44px;
    height: 44px;
    object-fit: contain;
    background: var(--surface-2);
    border-radius: var(--radius-sm);
  }

  .thumb.empty {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    opacity: 0.5;
  }

  .main {
    min-width: 0;
  }

  .title {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0;
    border: none;
    font-weight: 600;
  }

  .title:hover {
    color: var(--accent);
  }

  .sub {
    font-size: 11px;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 2px;
  }

  .want-cell {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }

  .who {
    font-size: 10px;
    max-width: 74px;
  }

  .price {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-size: 13px;
  }

  @media (max-width: 900px) {
    .row-item {
      grid-template-columns: auto 44px 1fr auto;
    }

    .want-cell:last-of-type {
      display: none;
    }
  }
</style>
