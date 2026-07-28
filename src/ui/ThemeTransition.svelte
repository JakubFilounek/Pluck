<script lang="ts">
  import CatScene from './CatScene.svelte';
  import TechScene from './TechScene.svelte';
  import type { PersonId } from '../domain/types';

  /**
   * Full-screen wipe played when the active person changes.
   *
   * The timer deliberately lives outside the effect and is NOT cleared from an effect
   * cleanup. That pattern has stranded this veil twice: Svelte runs cleanup on any
   * re-run, not only on unmount, so an unrelated re-render cancelled the dismissal
   * and then took the `person === previous` early return — leaving the veil, and its
   * cats, covering the whole UI until a reload.
   *
   * It is cleared in exactly two places: when a new wipe starts, and on unmount.
   */

  type Props = { person: PersonId };

  let { person }: Props = $props();

  /** Bumped per switch so the veil element is rebuilt rather than reused. */
  let run = $state(0);
  let showing = $state(false);
  /* svelte-ignore state_referenced_locally */
  let shown = $state<PersonId>(person);
  /* svelte-ignore state_referenced_locally */
  let previous: PersonId = person;

  let failsafe: ReturnType<typeof setTimeout> | undefined;
  const DURATION_MS = 1150;

  function dismiss() {
    clearTimeout(failsafe);
    failsafe = undefined;
    showing = false;
  }

  $effect(() => {
    if (person === previous) return;
    previous = person;

    shown = person;
    run += 1;
    showing = true;

    // Belt and braces alongside animationend: a backgrounded tab, reduced motion or
    // an interrupted animation must not be able to leave this up.
    clearTimeout(failsafe);
    failsafe = setTimeout(dismiss, DURATION_MS + 400);
  });

  // Unmount only — never on a re-run.
  $effect(() => () => clearTimeout(failsafe));
</script>

{#if showing}
  {#key run}
    <div class="switch-veil" aria-hidden="true" onanimationend={dismiss}>
      <div class="emblem">
        {#if shown === 'a'}
          <TechScene width={340} still />
        {:else}
          <CatScene width={340} still />
        {/if}
      </div>
    </div>
  {/key}
{/if}
