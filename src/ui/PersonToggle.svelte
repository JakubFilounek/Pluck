<script lang="ts">
  import { PERSON_IDS, type PersonId } from '../domain/types';

  type Props = {
    active: PersonId;
    names: Record<PersonId, string>;
    onchange: (person: PersonId) => void;
  };

  let { active, names, onchange }: Props = $props();
</script>

<!--
  Who is using the browser right now. This drives surprise mode, so it is deliberately
  prominent rather than buried in settings — getting it wrong is what spoils a gift.
-->
<div class="toggle" role="group" aria-label="Active person">
  {#each PERSON_IDS as person (person)}
    <button
      type="button"
      class="option"
      class:active={active === person}
      aria-pressed={active === person}
      onclick={() => onchange(person)}
    >
      {names[person]}
    </button>
  {/each}
</div>

<style>
  .toggle {
    display: inline-flex;
    padding: 2px;
    background: var(--surface-2);
    border-radius: 999px;
    border: 1px solid var(--border);
  }

  .option {
    padding: 3px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-dim);
    border: none;
    max-width: 90px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .option.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow);
  }
</style>
