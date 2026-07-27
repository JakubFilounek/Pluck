<script lang="ts">
  /**
   * Person A's motif: a monitor on a circuit board. The trace nodes pulse and the
   * terminal caret blinks — animation classes come from effects.css.
   */

  type Props = {
    size?: number;
    subtle?: boolean;
  };

  let { size = 120, subtle = false }: Props = $props();
</script>

<svg
  class="tech"
  class:subtle
  width={size}
  height={size * 0.62}
  viewBox="0 0 200 124"
  fill="none"
  aria-hidden="true"
>
  <!-- Circuit traces running out to the edges -->
  <g stroke="currentColor" stroke-width="1.5" opacity="0.45" stroke-linecap="round">
    <path d="M4 100 H30 V80 H52" />
    <path d="M4 60 H22 V44 H50" />
    <path d="M196 100 H170 V78 H150" />
    <path d="M196 54 H178 V38 H150" />
    <path d="M100 118 V108" />
  </g>
  <g fill="currentColor" opacity="0.85">
    <circle class="tech-node" cx="4" cy="100" r="3" style="animation-delay: -0.2s" />
    <circle class="tech-node" cx="4" cy="60" r="3" style="animation-delay: -1.1s" />
    <circle class="tech-node" cx="196" cy="100" r="3" style="animation-delay: -1.7s" />
    <circle class="tech-node" cx="196" cy="54" r="3" style="animation-delay: -0.8s" />
  </g>

  <!-- Stand -->
  <rect x="86" y="96" width="28" height="9" rx="2.5" fill="currentColor" opacity="0.55" />
  <rect x="70" y="105" width="60" height="7" rx="3.5" fill="currentColor" opacity="0.75" />

  <!-- Monitor shell -->
  <rect
    x="48"
    y="16"
    width="104"
    height="80"
    rx="9"
    fill="var(--surface-2)"
    stroke="currentColor"
    stroke-width="2.5"
  />
  <!-- Screen -->
  <rect x="56" y="24" width="88" height="60" rx="5" fill="var(--bg)" />

  <!-- Terminal content: a prompt, two lines of "output", and a blinking caret -->
  <g fill="currentColor">
    <rect x="63" y="32" width="7" height="3" rx="1.5" opacity="0.9" />
    <rect x="74" y="32" width="30" height="3" rx="1.5" opacity="0.55" />
    <rect x="63" y="42" width="46" height="3" rx="1.5" opacity="0.4" />
    <rect x="63" y="52" width="34" height="3" rx="1.5" opacity="0.4" />
    <rect x="63" y="62" width="7" height="3" rx="1.5" opacity="0.9" />
    <rect class="tech-caret" x="74" y="60" width="6" height="7" rx="1" />
  </g>

  <!-- Power light -->
  <circle class="tech-node" cx="100" cy="90" r="2.6" fill="currentColor" />
</svg>

<style>
  .tech {
    display: block;
    color: var(--accent);
  }

  .subtle {
    opacity: 0.85;
  }
</style>
