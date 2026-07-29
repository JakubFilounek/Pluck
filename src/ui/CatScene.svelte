<script lang="ts">
  import { untrack } from 'svelte';
  import Cat from './Cat.svelte';
  import {
    nextPose,
    planChase,
    planMove,
    planRest,
    type CatState,
    type SceneBounds,
  } from './catScene';

  /**
   * Person B's scene: two cats living their own lives — wandering, sitting, grooming,
   * flopping down to sleep, and occasionally one bolting after the other.
   *
   * Each cat runs an independent loop; a separate timer sometimes interrupts both
   * with a chase. Movement is a CSS transform transition whose duration is computed
   * from the distance, so speed stays constant instead of varying with step size.
   */

  type Props = {
    width?: number;
    /** Static pose only — used where an animated scene would be a distraction. */
    still?: boolean;
  };

  let { width = 320, still = false }: Props = $props();

  const BOUNDS: SceneBounds = { min: 26, max: 294 };
  const FLOOR = 104;

  let black = $state<CatState>({ x: 118, facing: 1, pose: 'sit', duration: 2000 });
  let white = $state<CatState>({ x: 196, facing: -1, pose: 'sit', duration: 2400 });

  // Not $state: only read inside timers, and mutating it must not schedule a render.
  let chasing = false;

  $effect(() => {
    if (still) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const timers = new Set<ReturnType<typeof setTimeout>>();

    /** Runs one cat's action, then schedules the next. */
    function step(which: 'black' | 'white') {
      const state = which === 'black' ? black : white;
      const pose = nextPose(Math.random, state.pose);

      let next: CatState;

      if (pose === 'walk' || pose === 'run') {
        const move = planMove(Math.random, state.x, BOUNDS, pose);
        next = { ...state, ...move, pose };
      } else {
        next = { ...state, pose, duration: planRest(Math.random, pose) };
      }

      if (which === 'black') black = next;
      else white = next;

      const timer = setTimeout(() => {
        timers.delete(timer);
        // A chase owns both cats until it finishes; don't fight it.
        if (!chasing) step(which);
      }, next.duration);

      timers.add(timer);
    }

    /** Occasionally interrupts both cats with a chase. */
    function maybeChase() {
      const timer = setTimeout(
        () => {
          timers.delete(timer);

          const pursuerIsBlack = Math.random() < 0.5;
          const plan = planChase(
            pursuerIsBlack ? black : white,
            pursuerIsBlack ? white : black,
            BOUNDS,
          );

          if (plan) {
            chasing = true;
            const pursuer = { ...(pursuerIsBlack ? black : white), ...plan.pursuer } as CatState;
            const target = { ...(pursuerIsBlack ? white : black), ...plan.target } as CatState;

            if (pursuerIsBlack) {
              black = pursuer;
              white = target;
            } else {
              white = pursuer;
              black = target;
            }

            const release = setTimeout(() => {
              timers.delete(release);
              chasing = false;
              step('black');
              step('white');
            }, pursuer.duration);

            timers.add(release);
          }

          maybeChase();
        },
        9000 + Math.random() * 14000,
      );

      timers.add(timer);
    }

    // Startup reads and updates both reactive cat states. Without untracking,
    // Svelte sees a self-updating effect and stops the whole dashboard.
    untrack(() => {
      step('black');
      step('white');
      maybeChase();
    });

    return () => {
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      chasing = false;
    };
  });
</script>

<svg
  class="scene"
  width={width}
  height={width * 0.4}
  viewBox="0 0 320 128"
  fill="none"
  aria-hidden="true"
>
  <!-- Floor line, faint: without it the cats read as floating. -->
  <line
    x1="12"
    y1={FLOOR + 1}
    x2="308"
    y2={FLOOR + 1}
    stroke="currentColor"
    stroke-width="1"
    opacity="0.12"
    stroke-linecap="round"
  />

  <g
    class="mover"
    style="transform: translate({black.x}px, {FLOOR}px) scaleX({black.facing}); transition-duration: {black.duration}ms"
  >
    <Cat variant="black" pose={black.pose} phase={-1.3} />
  </g>

  <g
    class="mover"
    style="transform: translate({white.x}px, {FLOOR}px) scaleX({white.facing}); transition-duration: {white.duration}ms"
  >
    <Cat variant="white" pose={white.pose} phase={-2.9} />
  </g>
</svg>

<style>
  .scene {
    display: block;
    color: var(--text);
    overflow: visible;
  }

  .mover {
    /* Linear, so a cat travels at a constant speed rather than easing into every
       step; the duration is set per move from the distance. */
    transition-property: transform;
    transition-timing-function: linear;
  }

  @media (prefers-reduced-motion: reduce) {
    .mover {
      transition: none;
    }
  }
</style>
