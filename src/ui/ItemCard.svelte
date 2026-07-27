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

<article class="card item" class:selected class:faded={item.status === 'dropped'}>
  <div class="thumb-wrap">
    {#if item.imageUrl}
      <img class="thumb" src={item.imageUrl} alt="" loading="lazy" />
    {:else}
      <div class="thumb empty"><Icon name={category?.icon ?? 'box'} size={40} weight={1.4} /></div>
    {/if}

    <label class="pick">
      <input
        type="checkbox"
        checked={selected}
        onclick={(event) => onselect(event.shiftKey)}
        aria-label="Select {item.title}"
      />
    </label>

    <div class="flags">
      {#if item.status === 'bought'}
        <span class="badge badge-bought">Bought</span>
      {:else if item.status === 'dropped'}
        <span class="badge badge-dropped">Dropped</span>
      {/if}
      {#if item.giftFor}
        <span class="badge badge-gift"><Icon name="gift" size={12} weight={2} />{personNames[item.giftFor]}</span>
      {/if}
    </div>
  </div>

  <div class="body">
    <button class="title" onclick={onopen} title={item.title}>
      <span class="clamp-2">{item.title}</span>
    </button>

    <div class="spread meta">
      <span class="muted truncate">{item.site}</span>
      {#if item.price}
        <strong>{formatPrice(item.price)}</strong>
      {/if}
    </div>

    <div class="wants">
      <span class="who muted truncate">{personNames[viewer]}</span>
      <WantStars
        value={item.want[viewer]}
        label="{personNames[viewer]} wants this"
        size="sm"
        onchange={(value) => onwant(viewer, value)}
      />
      <span class="who muted truncate">{personNames[theirs]}</span>
      <WantStars
        value={item.want[theirs]}
        label="{personNames[theirs]} wants this"
        size="sm"
        onchange={(value) => onwant(theirs, value)}
      />
    </div>

    {#if itemTags.length > 0}
      <div class="tags">
        {#each itemTags as tag (tag.id)}
          <TagChip {tag} />
        {/each}
      </div>
    {/if}
  </div>
</article>

<style>
  .item {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: border-color 0.12s ease;
  }

  .item.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }

  .item.faded {
    opacity: 0.55;
  }

  .thumb-wrap {
    position: relative;
    background: var(--surface-2);
  }

  .thumb {
    width: 100%;
    height: 150px;
    object-fit: contain;
    display: block;
  }

  .thumb.empty {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 34px;
    opacity: 0.5;
  }

  .pick {
    position: absolute;
    top: 6px;
    left: 6px;
  }

  .pick input {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .flags {
    position: absolute;
    top: 6px;
    right: 6px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
  }

  .body {
    padding: 9px 10px 10px;
    display: flex;
    flex-direction: column;
    gap: 7px;
    flex: 1;
  }

  .title {
    text-align: left;
    padding: 0;
    border: none;
    font-weight: 600;
    font-size: 13px;
    line-height: 1.35;
    min-height: 2.7em;
  }

  .title:hover {
    color: var(--accent);
  }

  .meta {
    font-size: 12px;
  }

  .wants {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 6px;
    align-items: center;
    font-size: 11px;
  }

  .who {
    max-width: 70px;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
</style>
