<script lang="ts">
  import CatScene from './CatScene.svelte';
  import TechScene from './TechScene.svelte';
  import type { PersonId } from '../domain/types';

  /**
   * Full-screen wipe played when the active person changes.
   *
   * Two independent ways to end — the CSS animation's own `animationend`, and a
   * hard timeout — because a veil that fails to dismiss covers the entire UI and
   * needs a reload to clear. Belt and braces is cheap here; the earlier versions
   * managed to get stuck twice, once by clearing its timers from an effect cleanup
   * and once by racing a restart against animationend.
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

  const DURATION_MS = 1150;

  $effect(() => {
    if (person === previous) return;
    previous = person;

    shown = person;
    run += 1;
    showing = true;

    // Safety net: if animationend never arrives — reduced motion, a backgrounded
    // tab, an interrupted animation — the veil still goes away on its own.
    const failsafe = setTimeout(() => (showing = false), DURATION_MS + 400);
    return () => clearTimeout(failsafe);
  });
</script>

{#if showing}
  {#key run}
    <div class="switch-veil" aria-hidden="true" onanimationend={() => (showing = false)}>
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
