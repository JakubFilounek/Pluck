<script lang="ts">
  /**
   * Person B's motif: a black cat and a white cat with a few black spots, sitting
   * together. Tails sway, chests rise, and they blink on an offset timer so they
   * never blink in unison — the animation classes are defined in effects.css.
   */

  type Props = {
    size?: number;
    /** Muted variant for corners and empty states. */
    subtle?: boolean;
  };

  let { size = 120, subtle = false }: Props = $props();
</script>

<svg
  class="cats"
  class:subtle
  width={size}
  height={size * 0.62}
  viewBox="0 0 200 124"
  fill="none"
  aria-hidden="true"
>
  <!-- Shadow they both sit on -->
  <ellipse cx="100" cy="116" rx="74" ry="6" fill="currentColor" opacity="0.12" />

  <!-- ------------------------------------------------ Black cat (left) -->
  <!-- Fills come from tokens: a literal #000 cat disappears entirely against the
       dark palette, so --cat-black lifts to a warm charcoal there and --cat-outline
       adds a faint rim to keep the silhouette readable. -->
  <g class="cat-body" style="animation-delay: -1.1s">
    <!-- Tail, animated from its base so the tip travels furthest -->
    <path
      class="cat-tail"
      d="M40 96 C14 92 10 66 26 56"
      stroke="var(--cat-black)"
      stroke-width="9"
      stroke-linecap="round"
    />
    <!-- Body and head -->
    <path
      d="M42 112 C42 84 52 70 68 70 C84 70 94 84 94 112 Z"
      fill="var(--cat-black)"
      stroke="var(--cat-outline)"
      stroke-width="1.5"
    />
    <circle
      cx="68"
      cy="56"
      r="24"
      fill="var(--cat-black)"
      stroke="var(--cat-outline)"
      stroke-width="1.5"
    />
    <!-- Ears -->
    <path d="M48 42 L50 22 L66 34 Z" fill="var(--cat-black)" />
    <path d="M88 42 L86 22 L70 34 Z" fill="var(--cat-black)" />
    <path d="M52 39 L53 29 L62 35 Z" fill="#e59ac0" opacity="0.75" />
    <path d="M84 39 L83 29 L74 35 Z" fill="#e59ac0" opacity="0.75" />
    <!-- Eyes -->
    <g fill="#f7e07a">
      <ellipse class="cat-eye" cx="59" cy="55" rx="4.6" ry="5.6" style="animation-delay: -2s" />
      <ellipse class="cat-eye" cx="77" cy="55" rx="4.6" ry="5.6" style="animation-delay: -2s" />
    </g>
    <g fill="#1a1218">
      <ellipse cx="59" cy="55" rx="1.5" ry="5" />
      <ellipse cx="77" cy="55" rx="1.5" ry="5" />
    </g>
    <path d="M65 64 L68 67 L71 64" stroke="#e59ac0" stroke-width="2" stroke-linecap="round" />
  </g>

  <!-- ------------------------------------ White cat with black spots (right) -->
  <g class="cat-body" style="animation-delay: -2.6s">
    <path
      class="cat-tail"
      d="M160 96 C186 92 190 68 174 58"
      stroke="var(--cat-white)"
      stroke-width="9"
      stroke-linecap="round"
    />
    <path
      d="M106 112 C106 84 116 70 132 70 C148 70 158 112 158 112 Z"
      fill="var(--cat-white)"
      stroke="var(--cat-white-outline)"
      stroke-width="1.5"
    />
    <circle
      cx="132"
      cy="58"
      r="23"
      fill="var(--cat-white)"
      stroke="var(--cat-white-outline)"
      stroke-width="1.5"
    />
    <path
      d="M113 44 L115 25 L130 36 Z"
      fill="var(--cat-white)"
      stroke="var(--cat-white-outline)"
      stroke-width="1.5"
    />
    <path d="M151 44 L149 25 L134 36 Z" fill="var(--cat-white)" />
    <path d="M117 41 L118 32 L126 37 Z" fill="#e59ac0" opacity="0.8" />
    <path d="M147 41 L146 32 L138 37 Z" fill="#e59ac0" opacity="0.8" />

    <!-- The few black spots: one over an ear, one on the cheek, two on the body.
         These keep a true dark fill — they read as markings against the white cat
         regardless of theme. -->
    <path d="M151 44 L149 25 L134 36 Z" fill="#2b1f28" opacity="0.92" />
    <ellipse cx="119" cy="66" rx="6" ry="4.5" fill="#2b1f28" opacity="0.9" />
    <ellipse cx="140" cy="96" rx="9" ry="7" fill="#2b1f28" opacity="0.9" />
    <ellipse cx="121" cy="104" rx="5" ry="4" fill="#2b1f28" opacity="0.82" />

    <g fill="#8fd3e8">
      <ellipse class="cat-eye" cx="124" cy="57" rx="4.4" ry="5.4" />
      <ellipse class="cat-eye" cx="141" cy="57" rx="4.4" ry="5.4" />
    </g>
    <g fill="#1a1218">
      <ellipse cx="124" cy="57" rx="1.4" ry="4.8" />
      <ellipse cx="141" cy="57" rx="1.4" ry="4.8" />
    </g>
    <path d="M129 66 L132 69 L135 66" stroke="#d98cb3" stroke-width="2" stroke-linecap="round" />
  </g>
</svg>

<style>
  .cats {
    display: block;
    color: var(--text);
  }

  .subtle {
    opacity: 0.85;
  }
</style>
