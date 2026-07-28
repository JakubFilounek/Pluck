<script lang="ts">
  import type { CatPose } from './catScene';

  /**
   * One cat, in side profile, drawn in local coordinates where (0, 0) is the point
   * its feet touch the floor and it faces +x.
   *
   * Profile rather than front-on: these cats travel horizontally, and a front-facing
   * cat sliding sideways can never read as walking however its legs are animated.
   * In profile a four-leg gait works, which is what makes movement look like movement.
   *
   * Poses are built from rotations and translations of separate parts — never by
   * scaling the body, which is what previously squashed them across the floor.
   */

  type Props = {
    variant: 'black' | 'white';
    pose: CatPose;
    /** Offsets each cat's idle timing so the two never move in lockstep. */
    phase?: number;
  };

  let { variant, pose, phase = 0 }: Props = $props();

  const coat = $derived(variant === 'black' ? 'var(--cat-black)' : 'var(--cat-white)');
  const outline = $derived(
    variant === 'black' ? 'var(--cat-outline)' : 'var(--cat-white-outline)',
  );
  const eyeColor = $derived(variant === 'black' ? '#f7e07a' : '#8fd3e8');

  const asleep = $derived(pose === 'sleep');
  const down = $derived(pose === 'lie' || pose === 'sleep');
  const sitting = $derived(pose === 'sit' || pose === 'groom');
</script>

<g class="cat {pose}" style="--phase: {phase}s">
  <!-- Contact shadow, drawn first so the cat is always on top of it. -->
  <ellipse class="shadow" cx="-2" cy="0" rx="17" ry="2.6" />

  <g class="frame">
    <!-- Far legs first, in a darker tint, so the near pair reads in front. -->
    <g class="legs far" stroke={coat} stroke-width="4.6" stroke-linecap="round">
      <path class="leg leg-hind-far" d="M-12 -13 V-1" />
      <path class="leg leg-fore-far" d="M8 -12 V-1" />
    </g>

    <!-- Tail, rooted at the hip. -->
    <path
      class="tail"
      d="M-17 -19 C-25 -22 -27 -32 -21 -36"
      stroke={coat}
      stroke-width="4.4"
      stroke-linecap="round"
      fill="none"
    />

    <g class="body">
      <!-- Torso: a single rounded form from haunch to shoulder. -->
      <path
        d="M-18 -13 C-19 -24 -14 -28 -6 -28 H8 C15 -28 17 -23 16 -13 C15 -9 10 -8 4 -8 H-8 C-14 -8 -17.5 -9.5 -18 -13 Z"
        fill={coat}
        stroke={outline}
        stroke-width="1.1"
      />

      {#if variant === 'white'}
        <!-- The few black spots, on the torso so they travel with it. -->
        <g fill="#2b1f28" opacity="0.9">
          <ellipse cx="-8" cy="-19" rx="4.4" ry="3.4" />
          <ellipse cx="4" cy="-13" rx="3" ry="2.3" />
        </g>
      {/if}

      <g class="head">
        <circle cx="19" cy="-27" r="9.2" fill={coat} stroke={outline} stroke-width="1.1" />
        <!-- Ears -->
        <path d="M13 -33 L12.5 -41 L19.5 -35.5 Z" fill={coat} />
        <path d="M22 -34.5 L25 -41.5 L27 -33 Z" fill={coat} />
        <path d="M14.6 -34.3 L14.3 -38.6 L18 -35.6 Z" fill="#e59ac0" opacity="0.75" />
        <path d="M23 -35 L24.6 -39 L25.6 -34 Z" fill="#e59ac0" opacity="0.75" />

        {#if variant === 'white'}
          <path d="M13 -33 L12.5 -41 L19.5 -35.5 Z" fill="#2b1f28" opacity="0.9" />
        {/if}

        <!-- Muzzle -->
        <path d="M25 -25 q4 0.6 4.4 3" fill="none" stroke={coat} stroke-width="4.6" stroke-linecap="round" />

        {#if asleep}
          <path
            d="M20 -28 q2.6 2.2 5.2 0"
            stroke="#1a1218"
            stroke-width="1.4"
            stroke-linecap="round"
            fill="none"
          />
        {:else}
          <ellipse class="eye" cx="22.5" cy="-28.5" rx="2.4" ry="2.9" fill={eyeColor} />
          <ellipse cx="23.2" cy="-28.5" rx="0.85" ry="2.5" fill="#1a1218" />
        {/if}

        <circle cx="29.6" cy="-22.6" r="1.2" fill="#e59ac0" />
      </g>
    </g>

    <!-- Near legs, drawn over the body. -->
    <g class="legs near" stroke={coat} stroke-width="5" stroke-linecap="round">
      <path class="leg leg-hind" d="M-13 -13 V-1" />
      <path class="leg leg-fore" d="M9 -12 V-1" />
    </g>
  </g>

  {#if asleep}
    <g class="zzz" fill="currentColor" opacity="0.75">
      <text x="30" y="-36" font-size="7.5" font-weight="700">z</text>
      <text x="36" y="-43" font-size="6" font-weight="700">z</text>
    </g>
  {/if}
</g>

<style>
  /* transform-box: fill-box throughout — a CSS transform-origin on an SVG element
     otherwise resolves against the whole scene view-box, not the element. */
  .frame,
  .body,
  .head,
  .tail,
  .legs,
  .leg,
  .eye {
    transform-box: fill-box;
  }

  .shadow {
    fill: currentColor;
    opacity: 0.15;
    transition: rx 0.4s ease, opacity 0.4s ease;
  }

  .cat.lie .shadow,
  .cat.sleep .shadow {
    rx: 20;
  }

  .body,
  .head,
  .tail,
  .legs,
  .frame {
    transition: transform 0.4s cubic-bezier(0.3, 0.85, 0.35, 1), opacity 0.3s ease;
  }

  /* Legs pivot at the shoulder/hip, i.e. the top of the stroke. */
  .leg {
    transform-origin: 50% 0%;
    transition: transform 0.3s ease;
  }

  .tail {
    transform-origin: 100% 100%;
  }

  .eye {
    transform-origin: 50% 50%;
  }

  /* Pivot the torso about its rear underside, so tipping it back lifts the chest
     rather than driving the haunches through the floor. */
  .body {
    transform-origin: 12% 100%;
  }

  /*
   * Sitting: rear on the ground, chest up, forelegs propping the front.
   * A gentle tip plus shortened hind legs just read as a standing cat with stumpy
   * back legs — the angle has to be decisive, and the hind legs fold away entirely.
   */
  .cat.sit .body,
  .cat.groom .body {
    transform: translateY(3px) rotate(-24deg);
  }

  .cat.sit .leg-hind,
  .cat.sit .leg-hind-far,
  .cat.groom .leg-hind,
  .cat.groom .leg-hind-far {
    opacity: 0;
  }

  .cat.sit .leg-fore,
  .cat.sit .leg-fore-far,
  .cat.groom .leg-fore,
  .cat.groom .leg-fore-far {
    transform: translate(4px, -4px);
  }

  .cat.sit .tail,
  .cat.groom .tail {
    transform: translateY(5px) rotate(24deg);
  }

  .cat.groom .head {
    transform: translate(-5px, 9px) rotate(46deg);
  }

  /* Lying: everything settles onto the floor, legs tuck away under the body. */
  .cat.lie .frame,
  .cat.sleep .frame {
    transform: translateY(9px);
  }

  .cat.lie .legs,
  .cat.sleep .legs {
    opacity: 0;
  }

  .cat.lie .head,
  .cat.sleep .head {
    transform: translate(-3px, 4px) rotate(6deg);
  }

  .cat.lie .tail,
  .cat.sleep .tail {
    transform: translate(2px, 10px) rotate(58deg);
  }

  /* Moving: lean into the direction of travel. */
  .cat.run .body {
    transform: rotate(-5deg);
  }

  @media (prefers-reduced-motion: no-preference) {
    .tail {
      animation: tail-sway 3.4s ease-in-out infinite;
      animation-delay: var(--phase);
    }

    .cat.walk .tail {
      animation-duration: 1.2s;
    }

    .cat.run .tail {
      animation-duration: 0.42s;
    }

    .cat.lie .tail,
    .cat.sleep .tail {
      animation: none;
    }

    .eye {
      animation: blink 6.5s ease-in-out infinite;
      animation-delay: var(--phase);
    }

    /*
     * The gait. Four legs on the same keyframes at four different delays is what
     * makes it read as walking rather than as two legs flapping: diagonal pairs
     * move together, half a cycle apart.
     */
    .cat.walk .leg,
    .cat.run .leg {
      animation: step var(--gait, 0.5s) ease-in-out infinite;
    }

    .cat.walk .leg-hind,
    .cat.run .leg-hind {
      animation-delay: 0s;
    }

    .cat.walk .leg-fore,
    .cat.run .leg-fore {
      animation-delay: calc(var(--gait, 0.5s) * -0.5);
    }

    .cat.walk .leg-hind-far,
    .cat.run .leg-hind-far {
      animation-delay: calc(var(--gait, 0.5s) * -0.5);
    }

    .cat.walk .leg-fore-far,
    .cat.run .leg-fore-far {
      animation-delay: 0s;
    }

    .cat.walk {
      --gait: 0.5s;
    }

    .cat.run {
      --gait: 0.26s;
    }

    .cat.walk .frame {
      animation: bob 0.25s ease-in-out infinite;
    }

    .cat.run .frame {
      animation: bound 0.26s ease-in-out infinite;
    }

    .cat.sit .body,
    .cat.groom .body {
      animation: breathe-sit 4s ease-in-out infinite;
      animation-delay: var(--phase);
    }

    .cat.sleep .body {
      animation: breathe-lie 3.6s ease-in-out infinite;
    }

    .zzz text {
      animation: zzz 2.6s ease-out infinite;
    }

    .zzz text:last-child {
      animation-delay: 0.9s;
    }
  }

  @keyframes step {
    0%, 100% { transform: rotate(-24deg); }
    50% { transform: rotate(24deg); }
  }

  @keyframes bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-1.2px); }
  }

  @keyframes bound {
    0%, 100% { transform: translateY(0); }
    45% { transform: translateY(-3px); }
  }

  @keyframes tail-sway {
    0%, 100% { transform: rotate(-10deg); }
    50% { transform: rotate(14deg); }
  }

  @keyframes blink {
    0%, 94%, 100% { transform: scaleY(1); }
    97% { transform: scaleY(0.08); }
  }

  /* Restate the pose: an animation on .body overrides the class rule entirely. */
  @keyframes breathe-sit {
    0%, 100% { transform: translateY(3px) rotate(-24deg); }
    50% { transform: translateY(2.4px) rotate(-25deg); }
  }

  @keyframes breathe-lie {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-0.8px); }
  }

  @keyframes zzz {
    0% { transform: translate(0, 0); opacity: 0; }
    25% { opacity: 0.8; }
    100% { transform: translate(6px, -13px); opacity: 0; }
  }
</style>
