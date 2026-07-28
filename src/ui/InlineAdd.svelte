<script lang="ts">
  import Icon from './Icon.svelte';

  /**
   * A "+" that turns into a focused text field in place.
   *
   * Commits on Enter or on losing focus, but only when something was typed — an
   * empty field just closes again, so a stray click never creates a nameless row.
   * Escape always cancels, including over typed text.
   */

  type Props = {
    placeholder: string;
    label: string;
    onadd: (value: string) => void | Promise<void>;
  };

  let { placeholder, label, onadd }: Props = $props();

  let open = $state(false);
  let value = $state('');
  let input = $state<HTMLInputElement | null>(null);
  /** Set while cancelling so the blur handler doesn't also try to commit. */
  let cancelled = false;

  function start() {
    open = true;
    value = '';
    cancelled = false;
  }

  // Focus once the input actually exists. queueMicrotask ran before Svelte had
  // rendered it, so `input` was still null and the field opened unfocused — typing
  // went nowhere and, never having been focused, it never blurred to commit either.
  $effect(() => {
    if (open && input) input.focus();
  });

  async function commit() {
    if (cancelled) return;

    const trimmed = value.trim();
    open = false;
    value = '';

    if (trimmed) await onadd(trimmed);
  }

  function cancel() {
    cancelled = true;
    open = false;
    value = '';
  }

  function onkeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  }
</script>

{#if open}
  <input
    bind:this={input}
    bind:value
    class="inline-input"
    type="text"
    {placeholder}
    aria-label={label}
    onkeydown={onkeydown}
    onblur={commit}
  />
{:else}
  <button class="add-btn" type="button" onclick={start} aria-label={label} title={label}>
    <Icon name="plus" size={13} weight={2.4} />
  </button>
{/if}

<style>
  .add-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 5px;
    color: var(--text-dim);
    border: 1px solid transparent;
  }

  .add-btn:hover {
    color: var(--accent);
    background: var(--accent-soft);
    border-color: var(--accent-ghost);
  }

  .inline-input {
    /* Grows into the header row rather than forcing 100% and squashing the title. */
    flex: 1 1 auto;
    min-width: 80px;
    width: auto;
    padding: 3px 7px;
    font-size: 12px;
    /* Section headings are uppercased, and that inherits into the field. */
    text-transform: none;
    letter-spacing: normal;
    font-weight: 400;
    color: var(--text);
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-ghost);
  }
</style>
