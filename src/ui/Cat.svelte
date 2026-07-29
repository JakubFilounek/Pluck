<script lang="ts">
  import type { CatPose } from './catScene';

  /**
   * One cat, drawn in local coordinates where (0, 0) is the point its feet touch the
   * floor. Everything above the floor is negative Y, so a cat can be placed by simply
   * translating to a spot on the ground line.
   *
   * Poses are CSS transforms on named groups rather than alternative path sets — the
   * silhouette stays consistent and pose changes can tween.
   */

  type Props = {
    variant: 'black' | 'white';
    pose: CatPose;
    /** Distinguishes the two cats' animation phase so they never move in lockstep. */
    phase?: number;
  };

  let { variant, pose, phase = 0 }: Props = $props();

  const coat = $derived(variant === 'black' ? 'var(--cat-black)' : 'var(--cat-white)');
  const outline = $derived(
    variant === 'black' ? 'var(--cat-outline)' : 'var(--cat-white-outline)',
  );
  const eyeColor = $derived(variant === 'black' ? '#f7e07a' : '#8fd3e8');
  const asleep = $derived(pose === 'sleep');
  const moving = $derived(pose === 'walk' || pose === 'run');
</script>

<g class="cat {pose}" style="--phase: {phase}s">
  <!-- Contact shadow. Sits at the floor line and is drawn first, so the cat is always
       on top of it — it used to be a wide ellipse that read as a puddle in front. -->
  <ellipse class="shadow" cx="0" cy="0" rx="15" ry="3" />

  <g class="bob">
    <!-- Tail. Rooted at the hip so it visibly belongs to the body, and it never
         reaches below the floor line. -->
    <path
      class="tail"
      d="M11 -8 C22 -11 25 -24 18 -30"
      stroke={coat}
      stroke-width="5"
      stroke-linecap="round"
      fill="none"
    />

    <!-- Back legs stay planted; front legs carry the walk cycle. -->
    <g class="legs" stroke={coat} stroke-width="5.5" stroke-linecap="round">
      <path class="leg leg-back" d="M-6 -12 V-1" />
      <path class="leg leg-front" d="M5 -12 V-1" />
    </g>

    <g class="torso">
      <path
        class="body"
        d="M-12 -1 C-13.5 -19 -10 -31 0 -31 C10 -31 13.5 -19 12 -1 Z"
        fill={coat}
        stroke={outline}
        stroke-width="1.2"
      />

      <g class="head">
        <circle cx="0" cy="-41" r="12.5" fill={coat} stroke={outline} stroke-width="1.2" />
        <path d="M-11 -48 L-9.5 -59 L-2 -51 Z" fill={coat} />
        <path d="M11 -48 L9.5 -59 L2 -51 Z" fill={coat} />
        <path d="M-8.6 -50 L-7.9 -55.4 L-3.6 -50.9 Z" fill="#e59ac0" opacity="0.8" />
        <path d="M8.6 -50 L7.9 -55.4 L3.6 -50.9 Z" fill="#e59ac0" opacity="0.8" />

        {#if asleep}
          <!-- Closed eyes read as arcs; scaling an open eye to nothing just vanishes. -->
          <g stroke="#1a1218" stroke-width="1.5" stroke-linecap="round" fill="none">
            <path d="M-7.5 -42 q3 2.4 6 0" />
            <path d="M1.5 -42 q3 2.4 6 0" />
          </g>
        {:else}
          <g fill={eyeColor}>
            <ellipse class="eye" cx="-4.5" cy="-42.5" rx="2.6" ry="3.2" />
            <ellipse class="eye" cx="4.5" cy="-42.5" rx="2.6" ry="3.2" />
          </g>
          <g fill="#1a1218">
            <ellipse cx="-4.5" cy="-42.5" rx="0.9" ry="2.8" />
            <ellipse cx="4.5" cy="-42.5" rx="0.9" ry="2.8" />
          </g>
        {/if}

        <path
          d="M-2 -36 L0 -34.2 L2 -36"
          stroke="#e59ac0"
          stroke-width="1.3"
          stroke-linecap="round"
          fill="none"
        />
      </g>
    </g>

    {#if variant === 'white'}
      <!-- The few black spots. Placed on the torso and one ear so they move with it. -->
      <g fill="#2b1f28" opacity="0.9" class="spots">
        <ellipse cx="-6.5" cy="-14" rx="4.2" ry="3.2" />
        <ellipse cx="6" cy="-6" rx="3.2" ry="2.4" />
        <path d="M11 -48 L9.5 -59 L2 -51 Z" />
      </g>
    {/if}
  </g>

  {#if asleep}
    <g class="zzz" fill="currentColor" opacity="0.75">
      <text x="14" y="-52" font-size="8" font-weight="700">z</text>
      <text x="20" y="-60" font-size="6.5" font-weight="700">z</text>
    </g>
  {/if}
</g>

<style>
  .shadow {
    fill: currentColor;
    opacity: 0.14;
    transition: rx 0.4s ease, opacity 0.4s ease;
  }

  .cat.lie .shadow,
  .cat.sleep .shadow {
    rx: 19;
    opacity: 0.18;
  }

  /*
   * transform-box: fill-box everywhere that transforms.
   *
   * CSS transform-origin on an SVG element resolves against the whole view-box by
   * default, so `transform-origin: center` meant the centre of the 320x128 scene,
   * roughly 150 units away from the part being scaled. The torso appeared to stretch
   * across the floor and the eyes flew out of the head. fill-box makes each origin
   * relative to that element's own bounding box, which is what every rule here wants.
   */
  .torso,
  .head,
  .bob,
  .tail,
  .legs,
  .leg,
  .eye {
    transform-box: fill-box;
  }

  .torso,
  .head,
  .bob,
  .tail,
  .legs {
    transition: transform 0.45s cubic-bezier(0.3, 0.8, 0.4, 1);
  }

  /* Pivot points: a cat squashes down onto its feet, not around its middle. */
  .torso {
    transform-origin: 50% 100%;
  }

  .tail {
    /* The tail's root — the end that meets the hip — is its bottom-left corner. */
    transform-origin: 0% 100%;
  }

  .legs {
    transform-origin: 50% 0%;
  }

  .leg {
    transform-origin: 50% 0%;
  }

  .eye {
    transform-origin: 50% 50%;
  }

  /* Lying and sleeping: the cat settles onto its feet and spreads a little. */
  .cat.lie .torso,
  .cat.sleep .torso {
    transform: scaleY(0.5) scaleX(1.2);
  }

  .cat.lie .head,
  .cat.sleep .head {
    transform: translate(-4px, 22px);
  }

  .cat.lie .legs,
  .cat.sleep .legs {
    transform: translateY(9px) scaleY(0.2);
  }

  .cat.lie .tail,
  .cat.sleep .tail {
    transform: translateY(12px) rotate(46deg);
  }

  /* Walking and running lean the body into the direction of travel. */
  .cat.walk .torso {
    transform: rotate(-3deg);
  }

  .cat.run .torso {
    transform: rotate(-9deg) translateY(2px);
  }

  .cat.groom .head {
    transform: translateY(9px) rotate(-16deg);
  }

  @media (prefers-reduced-motion: no-preference) {
    .tail {
      animation: cat-tail-idle 3.6s ease-in-out infinite;
      animation-delay: var(--phase);
    }

    .cat.run .tail {
      animation-duration: 0.5s;
    }

    .cat.walk .tail {
      animation-duration: 1.3s;
    }

    .cat.sleep .tail,
    .cat.lie .tail {
      animation: none;
    }

    .eye {
      animation: cat-blink-eye 7s ease-in-out infinite;
      animation-delay: var(--phase);
    }

    .cat.walk .leg-front,
    .cat.run .leg-front {
      animation: cat-step 0.42s ease-in-out infinite;
    }

    .cat.walk .leg-back,
    .cat.run .leg-back {
      animation: cat-step 0.42s ease-in-out infinite reverse;
    }

    .cat.run .leg-front,
    .cat.run .leg-back {
      animation-duration: 0.22s;
    }

    .cat.walk .bob {
      animation: cat-bob 0.42s ease-in-out infinite;
    }

    .cat.run .bob {
      animation: cat-bob 0.22s ease-in-out infinite;
    }

    .cat.sit .torso {
      animation: cat-breathe 4s ease-in-out infinite;
      animation-delay: var(--phase);
    }

    .cat.sleep .torso {
      animation: cat-sleep-breathe 3.4s ease-in-out infinite;
    }

    .zzz text {
      animation: zzz-drift 2.6s ease-out infinite;
    }

    .zzz text:last-child {
      animation-delay: 0.9s;
    }
  }

  @keyframes cat-tail-idle {
    0%, 100% { transform: rotate(-9deg); }
    50% { transform: rotate(12deg); }
  }

  @keyframes cat-step {
    0%, 100% { transform: rotate(-22deg); }
    50% { transform: rotate(22deg); }
  }

  @keyframes cat-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-1.6px); }
  }

  @keyframes cat-breathe {
    0%, 100% { transform: scaleY(1); }
    50% { transform: scaleY(1.035); }
  }

  /* Must restate the lie pose: an animation on .torso overrides the class rule. */
  @keyframes cat-sleep-breathe {
    0%, 100% { transform: scaleY(0.5) scaleX(1.2); }
    50% { transform: scaleY(0.54) scaleX(1.22); }
  }

  @keyframes cat-blink-eye {
    0%, 93%, 100% { transform: scaleY(1); }
    96% { transform: scaleY(0.1); }
  }

  @keyframes zzz-drift {
    0% { transform: translate(0, 0); opacity: 0; }
    25% { opacity: 0.8; }
    100% { transform: translate(6px, -14px); opacity: 0; }
  }
</style>
