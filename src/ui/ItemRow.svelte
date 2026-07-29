<script lang="ts">
  import { formatPrice } from '../extract/price';
  import { otherPerson } from '../settings';
  import Icon from './Icon.svelte';
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
    <div class="thumb empty"><Icon name={category?.icon ?? 'box'} size={22} weight={1.5} /></div>
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
        <span class="badge badge-gift"><Icon name="gift" size={12} weight={2} />{personNames[item.giftFor]}</span>
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

  <a
    class="open-link"
    href={item.url}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Otevřít {item.title} v novém panelu"
    title="Otevřít původní produkt"
  ><Icon name="external" size={16} weight={2} /><span>Otevřít</span></a>
</div>

<style>
  .row-item {
    display: grid;
    grid-template-columns: auto 44px 1fr auto auto 90px auto;
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

  .open-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    min-height: 32px;
    padding: 0 9px;
    border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--border));
    border-radius: var(--radius-sm);
    color: var(--accent);
    font-size: 11px;
    font-weight: 650;
  }

  .open-link:hover,
  .open-link:focus-visible {
    color: var(--accent-contrast);
    background: var(--accent);
  }

  @media (max-width: 900px) {
    .row-item {
      grid-template-columns: auto 44px 1fr auto auto;
    }

    .want-cell:last-of-type {
      display: none;
    }

    .open-link span { display: none; }
  }
</style>
