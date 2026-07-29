<script lang="ts">
  import type { CatPose } from './catScene';

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
  const resting = $derived(pose === 'lie' || pose === 'sleep');
</script>

<g class="cat {pose}" style="--phase: {phase}s">
  {#if resting}
    <!-- A real curled-up silhouette. The previous version made a standing cat lie
         down by scaling its torso to half height and its legs to one fifth, which
         is the stretching users could see. This pose has its own geometry. -->
    <ellipse class="shadow wide" cx="0" cy="0" rx="23" ry="3" />
    <g class="rest-bob">
      <path
        class="rest-tail"
        d="M13 -7 C28 -5 30 -22 18 -28 C11 -31 6 -27 8 -23"
        stroke={coat}
        stroke-width="5"
        stroke-linecap="round"
        fill="none"
      />
      <ellipse cx="1" cy="-13" rx="22" ry="12" fill={coat} stroke={outline} stroke-width="1.2" />
      {#if variant === 'white'}
        <ellipse cx="7" cy="-15" rx="7" ry="5" fill="#2b1f28" opacity="0.9" />
      {/if}
      <g class="rest-head">
        <circle cx="-14" cy="-23" r="11" fill={coat} stroke={outline} stroke-width="1.2" />
        <path d="M-23 -29 L-22 -39 L-15 -32 Z" fill={coat} />
        <path d="M-5 -29 L-7 -39 L-14 -32 Z" fill={coat} />
        {#if variant === 'white'}
          <path d="M-5 -29 L-7 -39 L-14 -32 Z" fill="#2b1f28" opacity="0.9" />
        {/if}
        <g class="closed-eyes" stroke="#1a1218" stroke-width="1.4" stroke-linecap="round" fill="none">
          <path d="M-21 -23 q2.5 2 5 0" />
          <path d="M-13 -23 q2.5 2 5 0" />
        </g>
        <path d="M-16 -18.5 L-14 -17 L-12 -18.5" stroke="#e59ac0" stroke-width="1.2" stroke-linecap="round" fill="none" />
      </g>
    </g>

    {#if pose === 'sleep'}
      <g class="zzz" fill="currentColor" opacity="0.75">
        <text x="13" y="-38" font-size="8" font-weight="700">z</text>
        <text x="20" y="-47" font-size="6.5" font-weight="700">z</text>
      </g>
    {/if}
  {:else}
    <ellipse class="shadow" cx="0" cy="0" rx="15" ry="3" />
    <g class="bob">
      <path
        class="tail"
        d="M11 -8 C22 -11 25 -24 18 -30"
        stroke={coat}
        stroke-width="5"
        stroke-linecap="round"
        fill="none"
      />

      <g class="legs" stroke={coat} stroke-width="5.5" stroke-linecap="round">
        <path class="leg leg-back" d="M-6 -12 V-1" />
        <path class="leg leg-front" d="M5 -12 V-1" />
      </g>

      <g class="torso">
        <path
          d="M-12 -1 C-13.5 -19 -10 -31 0 -31 C10 -31 13.5 -19 12 -1 Z"
          fill={coat}
          stroke={outline}
          stroke-width="1.2"
        />
        {#if variant === 'white'}
          <g fill="#2b1f28" opacity="0.9">
            <ellipse cx="-6.5" cy="-14" rx="4.2" ry="3.2" />
            <ellipse cx="6" cy="-6" rx="3.2" ry="2.4" />
          </g>
        {/if}
      </g>

      <g class="head">
        <circle cx="0" cy="-41" r="12.5" fill={coat} stroke={outline} stroke-width="1.2" />
        <path d="M-11 -48 L-9.5 -59 L-2 -51 Z" fill={coat} />
        <path d="M11 -48 L9.5 -59 L2 -51 Z" fill={coat} />
        <path d="M-8.6 -50 L-7.9 -55.4 L-3.6 -50.9 Z" fill="#e59ac0" opacity="0.8" />
        <path d="M8.6 -50 L7.9 -55.4 L3.6 -50.9 Z" fill="#e59ac0" opacity="0.8" />
        {#if variant === 'white'}
          <path d="M11 -48 L9.5 -59 L2 -51 Z" fill="#2b1f28" opacity="0.9" />
        {/if}
        <g fill={eyeColor}>
          <ellipse class="eye" cx="-4.5" cy="-42.5" rx="2.6" ry="3.2" />
          <ellipse class="eye" cx="4.5" cy="-42.5" rx="2.6" ry="3.2" />
        </g>
        <g fill="#1a1218">
          <ellipse cx="-4.5" cy="-42.5" rx="0.9" ry="2.8" />
          <ellipse cx="4.5" cy="-42.5" rx="0.9" ry="2.8" />
        </g>
        <path d="M-2 -36 L0 -34.2 L2 -36" stroke="#e59ac0" stroke-width="1.3" stroke-linecap="round" fill="none" />
      </g>
    </g>
  {/if}
</g>

<style>
  .shadow {
    fill: currentColor;
    opacity: 0.14;
  }

  .shadow.wide {
    opacity: 0.18;
  }

  .head,
  .bob,
  .rest-bob,
  .tail,
  .rest-tail,
  .leg,
  .eye {
    transform-box: fill-box;
  }

  .head {
    transform-origin: 50% 70%;
    transition: transform 0.35s ease;
  }

  .tail,
  .rest-tail {
    transform-origin: 0% 100%;
  }

  .leg {
    transform-origin: 50% 0%;
  }

  .eye {
    transform-origin: 50% 50%;
  }

  .cat.groom .head {
    transform: translateY(5px) rotate(-12deg);
  }

  @media (prefers-reduced-motion: no-preference) {
    .tail {
      animation: cat-tail-idle 3.6s ease-in-out infinite;
      animation-delay: var(--phase);
    }

    .cat.run .tail { animation-duration: 0.5s; }
    .cat.walk .tail { animation-duration: 1.3s; }

    .eye {
      animation: cat-blink-eye 7s ease-in-out infinite;
      animation-delay: var(--phase);
    }

    .cat.walk .leg-front,
    .cat.run .leg-front { animation: cat-step 0.42s ease-in-out infinite; }
    .cat.walk .leg-back,
    .cat.run .leg-back { animation: cat-step 0.42s ease-in-out infinite reverse; }
    .cat.run .leg-front,
    .cat.run .leg-back { animation-duration: 0.22s; }
    .cat.walk .bob { animation: cat-bob 0.42s ease-in-out infinite; }
    .cat.run .bob { animation: cat-bob 0.22s ease-in-out infinite; }
    .cat.sit .bob { animation: cat-breathe 4s ease-in-out infinite; animation-delay: var(--phase); }
    .cat.sleep .rest-bob { animation: cat-rest-breathe 3.4s ease-in-out infinite; }
    .zzz text { animation: zzz-drift 2.6s ease-out infinite; }
    .zzz text:last-child { animation-delay: 0.9s; }
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
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-0.8px); }
  }

  @keyframes cat-rest-breathe {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-0.7px); }
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
