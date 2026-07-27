<script lang="ts">
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
      ★
    </button>
  {/each}
</div>

<style>
  .stars {
    display: inline-flex;
    gap: 1px;
  }

  .star {
    padding: 0 1px;
    font-size: 16px;
    line-height: 1;
    color: var(--border);
    background: none;
    border: none;
    transition: transform 0.08s ease;
  }

  .sm .star {
    font-size: 13px;
  }

  .star.filled {
    color: var(--want);
  }

  .star:not(.readonly):hover {
    transform: scale(1.2);
  }

  .star.readonly {
    cursor: default;
    opacity: 1;
  }
</style>
