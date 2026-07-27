<script lang="ts">
  import Icon from './Icon.svelte';
  import type { WantLevel } from '../domain/types';

  type Props = {
    value: WantLevel | undefined;
    label: string;
    readonly?: boolean;
    size?: 'sm' | 'md';
    onchange?: (value: WantLevel) => void;
  };

  let { value, label, readonly = false, size = 'md', onchange }: Props = $props();

  const levels: WantLevel[] = [1, 2, 3, 4, 5];

  function select(level: WantLevel) {
    if (readonly) return;
    // Clicking the current rating again clears it, which is the only way to get back
    // to "unrated" without a separate control.
    onchange?.(level === value ? 0 : level);
  }
</script>

<div class="stars" class:sm={size === 'sm'} role="group" aria-label={label}>
  {#each levels as level (level)}
    <button
      type="button"
      class="star"
      class:filled={(value ?? 0) >= level}
      class:readonly
      disabled={readonly}
      aria-label="{label}: {level} of 5"
      aria-pressed={(value ?? 0) >= level}
      onclick={() => select(level)}
    >
      <Icon
        name={(value ?? 0) >= level ? 'star' : 'star-empty'}
        size={size === 'sm' ? 13 : 17}
        weight={1.6}
      />
    </button>
  {/each}
</div>

<style>
  .stars {
    display: inline-flex;
    gap: 1px;
  }

  .star {
    display: inline-flex;
    padding: 0 1px;
    line-height: 0;
    /* Unfilled stars are outlines in the dim colour, not a lighter fill — the shape
       stays legible at 13px where a pale solid would disappear. */
    color: var(--text-dim);
    opacity: 0.55;
    background: none;
    border: none;
    transition: transform 0.08s ease, opacity 0.12s ease, color 0.12s ease;
  }

  .star.filled {
    color: var(--want);
    opacity: 1;
  }

  .star:not(.readonly):hover {
    transform: scale(1.2);
  }

  .star.readonly {
    cursor: default;
    opacity: 1;
  }
</style>
