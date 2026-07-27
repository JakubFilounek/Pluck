<script lang="ts">
  import type { Tag } from '../domain/types';

  type Props = {
    tag: Tag;
    selected?: boolean;
    count?: number;
    onclick?: () => void;
  };

  let { tag, selected = false, count, onclick }: Props = $props();
</script>

{#if onclick}
  <button
    type="button"
    class="chip"
    class:selected
    style="--tag-color: {tag.color}"
    aria-pressed={selected}
    {onclick}
  >
    <span class="dot"></span>
    <span class="truncate">{tag.name}</span>
    {#if count !== undefined}<span class="count">{count}</span>{/if}
  </button>
{:else}
  <span class="chip static" style="--tag-color: {tag.color}">
    <span class="dot"></span>
    <span class="truncate">{tag.name}</span>
  </span>
{/if}

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    background: color-mix(in srgb, var(--tag-color) 14%, transparent);
    color: var(--tag-color);
    border: 1px solid transparent;
    max-width: 100%;
  }

  .chip.selected {
    border-color: var(--tag-color);
    background: color-mix(in srgb, var(--tag-color) 26%, transparent);
  }

  .chip.static {
    cursor: default;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--tag-color);
    flex-shrink: 0;
  }

  .count {
    opacity: 0.7;
    font-variant-numeric: tabular-nums;
  }
</style>
