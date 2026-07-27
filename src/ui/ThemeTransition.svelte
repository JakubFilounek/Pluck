<script lang="ts">
  import CatArt from './CatArt.svelte';
  import TechArt from './TechArt.svelte';
  import type { PersonId } from '../domain/types';

  /**
   * Plays a full-screen wipe when the active person changes, carrying the incoming
   * person's emblem — a glitching monitor for A, the two cats for B.
   *
   * Purely cosmetic and pointer-events: none throughout, so it can never swallow a
   * click even if a timer were somehow missed.
   */

  type Props = { person: PersonId };

  let { person }: Props = $props();

  let showing = $state(false);
  let leaving = $state(false);

  // Seeded once on purpose: `shown` is what the veil displays mid-animation, and
  // `previous` is the change detector. Both are updated explicitly in the effect
  // below rather than tracking the prop.
  /* svelte-ignore state_referenced_locally */
  let shown = $state<PersonId>(person);
  /* svelte-ignore state_referenced_locally */
  let previous: PersonId = person;

  const IN_MS = 340;
  const HOLD_MS = 260;
  const OUT_MS = 420;

  $effect(() => {
    // Reading `person` registers the dependency; bail on the initial run and on
    // re-runs that didn't actually change who is active.
    if (person === previous) return;
    previous = person;

    shown = person;
    showing = true;
    leaving = false;

    const toLeaving = setTimeout(() => (leaving = true), IN_MS + HOLD_MS);
    const toDone = setTimeout(() => {
      showing = false;
      leaving = false;
    }, IN_MS + HOLD_MS + OUT_MS);

    return () => {
      // A rapid double-switch restarts the animation instead of stacking timers.
      clearTimeout(toLeaving);
      clearTimeout(toDone);
    };
  });
</script>

{#if showing}
  <div class="switch-veil" class:leaving aria-hidden="true">
    <div class="emblem">
      {#if shown === 'a'}
        <TechArt size={190} />
      {:else}
        <CatArt size={210} />
      {/if}
    </div>
  </div>
{/if}
