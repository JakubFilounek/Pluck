<script lang="ts">
  import CatScene from './CatScene.svelte';
  import TechScene from './TechScene.svelte';
  import type { PersonId } from '../domain/types';

  /**
   * Full-screen wipe played when the active person changes.
   *
   * The lifecycle is driven by the CSS animation's own `animationend` rather than by
   * timers. An earlier version cleared its timers from the effect's cleanup, which
   * Svelte also runs on an unrelated re-run — the veil then stayed up forever with
   * the whole UI behind it. Ending on the animation itself cannot get stuck that way:
   * if the animation runs at all, it finishes.
   */

  type Props = { person: PersonId };

  let { person }: Props = $props();

  let showing = $state(false);
  /* svelte-ignore state_referenced_locally */
  let shown = $state<PersonId>(person);
  /* svelte-ignore state_referenced_locally */
  let previous: PersonId = person;

  $effect(() => {
    if (person === previous) return;
    previous = person;
    shown = person;
    // Restart cleanly if a second switch lands mid-wipe.
    showing = false;
    requestAnimationFrame(() => (showing = true));
  });
</script>

{#if showing}
  <div
    class="switch-veil"
    aria-hidden="true"
    onanimationend={() => (showing = false)}
  >
    <div class="emblem">
      {#if shown === 'a'}
        <TechScene width={340} />
      {:else}
        <CatScene width={340} />
      {/if}
    </div>
  </div>
{/if}
