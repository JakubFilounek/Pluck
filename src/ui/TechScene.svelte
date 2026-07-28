<script lang="ts">
  /**
   * Person A's scene: a workstation that looks like it is doing something.
   *
   * The monitor cycles through three screens — a terminal typing itself out, a bar
   * chart that rebuilds, and a progress run — while packets travel the board traces,
   * the fan spins and the drive light flickers. The screen rotation is the only part
   * driven from JS; everything else is CSS.
   */

  type Props = {
    width?: number;
    still?: boolean;
  };

  let { width = 320, still = false }: Props = $props();

  type Screen = 'terminal' | 'chart' | 'progress';
  const SCREENS: Screen[] = ['terminal', 'chart', 'progress'];

  let screenIndex = $state(0);
  const screen = $derived(SCREENS[screenIndex] ?? 'terminal');

  // Bar heights are re-rolled each time the chart comes back around, so it doesn't
  // look like the same still image on every cycle.
  let bars = $state([9, 16, 11, 21, 14]);

  $effect(() => {
    if (still) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = setInterval(() => {
      screenIndex = (screenIndex + 1) % SCREENS.length;
      if (SCREENS[screenIndex] === 'chart') {
        bars = Array.from({ length: 5 }, () => 7 + Math.round(Math.random() * 16));
      }
    }, 4200);

    return () => clearInterval(timer);
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
  <!-- Board traces, with packets running along them -->
  <g stroke="currentColor" stroke-width="1.3" opacity="0.35" stroke-linecap="round">
    <path id="trace-l" d="M10 108 H54 V86 H86" />
    <path id="trace-r" d="M310 108 H266 V84 H234" />
    <path d="M20 62 H40 V44 H74" />
    <path d="M300 58 H280 V40 H246" />
  </g>

  <g fill="currentColor">
    <circle class="node" cx="10" cy="108" r="2.6" />
    <circle class="node" cx="310" cy="108" r="2.6" style="animation-delay: -1.1s" />
    <circle class="node" cx="20" cy="62" r="2.2" style="animation-delay: -1.9s" />
    <circle class="node" cx="300" cy="58" r="2.2" style="animation-delay: -0.6s" />
  </g>

  <g class="packets" fill="currentColor">
    <rect class="packet p1" x="-2.5" y="-1.2" width="5" height="2.4" rx="1.2" />
    <rect class="packet p2" x="-2.5" y="-1.2" width="5" height="2.4" rx="1.2" />
  </g>

  <!-- Monitor -->
  <rect x="98" y="16" width="124" height="80" rx="8" fill="var(--surface-2)" stroke="currentColor" stroke-width="2.2" />
  <rect x="105" y="23" width="110" height="60" rx="4" fill="var(--bg)" />

  <g clip-path="inset(23px 105px 45px 105px)">
    {#if screen === 'terminal'}
      <g class="terminal" fill="currentColor">
        <rect class="line l1" x="112" y="31" width="8" height="2.6" rx="1.3" opacity="0.9" />
        <rect class="line l1" x="124" y="31" width="34" height="2.6" rx="1.3" opacity="0.5" />
        <rect class="line l2" x="112" y="40" width="52" height="2.6" rx="1.3" opacity="0.42" />
        <rect class="line l3" x="112" y="49" width="38" height="2.6" rx="1.3" opacity="0.42" />
        <rect class="line l4" x="112" y="58" width="61" height="2.6" rx="1.3" opacity="0.42" />
        <rect class="line l5" x="112" y="67" width="8" height="2.6" rx="1.3" opacity="0.9" />
        <rect class="caret" x="124" y="65.4" width="5" height="6" rx="1" />
      </g>
    {:else if screen === 'chart'}
      <g class="chart" fill="currentColor">
        {#each bars as height, index (index)}
          <rect
            class="bar"
            x={116 + index * 18}
            y={74 - height}
            width="11"
            height={height}
            rx="2"
            opacity={0.45 + index * 0.1}
            style="animation-delay: {index * 70}ms; transform-origin: 0 74px"
          />
        {/each}
        <rect x="112" y="75" width="98" height="1.4" rx="0.7" opacity="0.3" />
      </g>
    {:else}
      <g class="progress" fill="currentColor">
        <rect x="112" y="36" width="44" height="2.6" rx="1.3" opacity="0.5" />
        <rect x="112" y="50" width="96" height="7" rx="3.5" opacity="0.18" />
        <rect class="fill" x="112" y="50" width="96" height="7" rx="3.5" opacity="0.85" />
        <rect x="112" y="66" width="30" height="2.4" rx="1.2" opacity="0.35" />
      </g>
    {/if}
  </g>

  <!-- Stand -->
  <rect x="146" y="96" width="28" height="8" rx="2.5" fill="currentColor" opacity="0.5" />
  <rect x="130" y="104" width="60" height="6" rx="3" fill="currentColor" opacity="0.7" />

  <!-- Tower with a spinning fan and a flickering drive light -->
  <rect x="236" y="46" width="42" height="64" rx="6" fill="var(--surface-2)" stroke="currentColor" stroke-width="2" />
  <g class="fan" style="transform-origin: 257px 72px">
    <circle cx="257" cy="72" r="12.5" fill="none" stroke="currentColor" stroke-width="1.6" opacity="0.5" />
    <g stroke="currentColor" stroke-width="2.4" stroke-linecap="round" opacity="0.8">
      <path d="M257 72 L257 61.5" />
      <path d="M257 72 L266 77.5" />
      <path d="M257 72 L248 77.5" />
    </g>
  </g>
  <circle class="drive" cx="257" cy="98" r="2.4" fill="currentColor" />

  <!-- Keyboard -->
  <rect x="118" y="114" width="84" height="7" rx="2.5" fill="currentColor" opacity="0.45" />
</svg>

<style>
  .scene {
    display: block;
    color: var(--accent);
    overflow: visible;
  }

  @media (prefers-reduced-motion: no-preference) {
    .node {
      animation: node-pulse 2.4s ease-in-out infinite;
    }

    /* Packets ride the traces via offset-path so they follow the corners. Hidden
       unless motion paths are actually supported — without offset-path they would
       pile up at the origin as stray dots in the corner. */
    .packet {
      display: none;
      offset-rotate: 0deg;
    }

    @supports (offset-path: path('M0 0 H1')) {
      .packet {
        display: block;
      }

      .p1 {
        offset-path: path('M10 108 H54 V86 H86');
        animation: packet-run 2.8s linear infinite;
      }

      .p2 {
        offset-path: path('M310 108 H266 V84 H234');
        animation: packet-run 3.4s linear infinite 1.2s;
      }
    }

    .fan {
      animation: fan-spin 1.6s linear infinite;
    }

    .drive {
      animation: drive-flicker 1.9s steps(1, end) infinite;
    }

    .caret {
      animation: caret-blink 1.1s steps(1, end) infinite;
    }

    /* Terminal lines type themselves in, one after another. */
    .line {
      transform-origin: 112px 0;
      animation: type-in 0.3s ease-out backwards;
    }

    .l2 { animation-delay: 0.35s; }
    .l3 { animation-delay: 0.7s; }
    .l4 { animation-delay: 1.05s; }
    .l5 { animation-delay: 1.4s; }

    .bar {
      animation: bar-grow 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) backwards;
    }

    .fill {
      transform-origin: 112px 0;
      animation: progress-fill 3.6s ease-in-out infinite;
    }
  }

  @keyframes node-pulse {
    0%, 100% { opacity: 0.45; }
    50% { opacity: 1; }
  }

  @keyframes packet-run {
    0% { offset-distance: 0%; opacity: 0; }
    12% { opacity: 0.9; }
    88% { opacity: 0.9; }
    100% { offset-distance: 100%; opacity: 0; }
  }

  @keyframes fan-spin {
    to { transform: rotate(360deg); }
  }

  @keyframes drive-flicker {
    0%, 40% { opacity: 0.25; }
    45%, 55% { opacity: 1; }
    60%, 75% { opacity: 0.25; }
    80% { opacity: 1; }
  }

  @keyframes caret-blink {
    0%, 45% { opacity: 1; }
    50%, 95% { opacity: 0; }
  }

  @keyframes type-in {
    from { transform: scaleX(0); opacity: 0; }
    to { transform: scaleX(1); opacity: 1; }
  }

  @keyframes bar-grow {
    from { transform: scaleY(0); }
    to { transform: scaleY(1); }
  }

  @keyframes progress-fill {
    0% { transform: scaleX(0); }
    70% { transform: scaleX(1); }
    100% { transform: scaleX(1); }
  }
</style>
