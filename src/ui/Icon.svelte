<script lang="ts">
  import { ICONS, resolveIcon, type IconDef, type IconName } from './icons';

  type Props = {
    /** Accepts a plain string so persisted category values can be passed straight in. */
    name: IconName | string;
    size?: number;
    /** Line weight; nudge up for very small sizes so icons don't thin out. */
    weight?: number;
    class?: string;
  };

  let { name, size = 18, weight = 1.7, class: klass = '' }: Props = $props();

  // Annotated to IconDef: `satisfies` on ICONS keeps each entry's exact literal type
  // (some have only `stroke`, some only `fill`), so the union has no common members
  // until it is widened here.
  const icon: IconDef = $derived(ICONS[resolveIcon(name)]);
</script>

<svg
  class="icon {klass}"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  aria-hidden="true"
  focusable="false"
>
  {#each icon.stroke ?? [] as d (d)}
    <path
      {d}
      stroke="currentColor"
      stroke-width={weight}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  {/each}
  {#each icon.fill ?? [] as d (d)}
    <path {d} fill="currentColor" />
  {/each}
</svg>

<style>
  .icon {
    display: inline-block;
    flex-shrink: 0;
    vertical-align: -0.15em;
  }
</style>
