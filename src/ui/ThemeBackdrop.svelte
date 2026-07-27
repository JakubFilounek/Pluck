<script lang="ts">
  import type { PersonId } from '../domain/types';

  /**
   * Fixed, non-interactive layer behind the whole UI. The grid, scanline and colour
   * wash come from CSS (see effects.css); the only thing built here is the drifting
   * paw prints for person B, which need individual offsets.
   */

  type Props = { person: PersonId };

  let { person }: Props = $props();

  // Fixed rather than random so the layout is stable across reloads and the same
  // paw never sits under the same card twice in a session.
  const paws = [
    { left: 6, delay: 0, duration: 15, scale: 1, tilt: -12, alpha: 0.35 },
    { left: 21, delay: 4.5, duration: 19, scale: 0.72, tilt: 14, alpha: 0.26 },
    { left: 38, delay: 9, duration: 16, scale: 0.9, tilt: -5, alpha: 0.3 },
    { left: 55, delay: 2.2, duration: 21, scale: 0.66, tilt: 20, alpha: 0.22 },
    { left: 71, delay: 12, duration: 17, scale: 1.05, tilt: -16, alpha: 0.32 },
    { left: 88, delay: 6.8, duration: 20, scale: 0.8, tilt: 8, alpha: 0.26 },
  ];
</script>

<div class="backdrop" aria-hidden="true">
  {#if person === 'b'}
    {#each paws as paw, index (index)}
      <svg
        class="paw"
        viewBox="0 0 24 24"
        width={26 * paw.scale}
        height={26 * paw.scale}
        style="left: {paw.left}%; --paw-delay: -{paw.delay}s; --paw-duration: {paw.duration}s; --paw-tilt: {paw.tilt}deg; --paw-alpha: {paw.alpha}"
      >
        <!-- Main pad plus four toes -->
        <ellipse cx="12" cy="16" rx="5.4" ry="4.6" fill="currentColor" />
        <ellipse cx="6.4" cy="9.6" rx="2.3" ry="3" fill="currentColor" />
        <ellipse cx="10.4" cy="6.6" rx="2.3" ry="3.1" fill="currentColor" />
        <ellipse cx="14.8" cy="6.8" rx="2.3" ry="3.1" fill="currentColor" />
        <ellipse cx="18.4" cy="10.2" rx="2.2" ry="2.9" fill="currentColor" />
      </svg>
    {/each}
  {/if}
</div>
