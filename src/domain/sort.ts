import { combinedWant, totalWant } from './filters';
import type { Item, PersonId } from './types';

export type SortMode =
  | 'want-combined'
  | 'want-mine'
  | 'want-theirs'
  | 'price-asc'
  | 'price-desc'
  | 'newest'
  | 'oldest'
  | 'title'
  | 'site';

export const SORT_LABELS: Record<SortMode, string> = {
  'want-combined': 'Nejvíc chtěné',
  'want-mine': 'Chci já',
  'want-theirs': 'Chce ten druhý',
  'price-asc': 'Nejlevnější',
  'price-desc': 'Nejdražší',
  newest: 'Nedávno přidané',
  oldest: 'Nejstarší',
  title: 'Název A–Z',
  site: 'Obchod',
};

/** Unpriced items sort last in both directions rather than pretending to cost zero. */
function comparePrice(left: Item, right: Item, direction: 1 | -1): number {
  const a = left.price?.amount;
  const b = right.price?.amount;

  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;

  return (a - b) * direction;
}

export function sortItems(items: Item[], mode: SortMode, viewer: PersonId): Item[] {
  const theirs: PersonId = viewer === 'a' ? 'b' : 'a';

  // Sort a copy: callers pass arrays straight from Dexie and from Svelte state.
  return [...items].sort((left, right) => {
    switch (mode) {
      case 'want-combined': {
        const byMax = combinedWant(right) - combinedWant(left);
        if (byMax !== 0) return byMax;

        // Both people wanting it at 3 beats one person wanting it at 3.
        const byTotal = totalWant(right) - totalWant(left);
        if (byTotal !== 0) return byTotal;
        break;
      }
      case 'want-mine': {
        const diff = (right.want[viewer] ?? 0) - (left.want[viewer] ?? 0);
        if (diff !== 0) return diff;
        break;
      }
      case 'want-theirs': {
        const diff = (right.want[theirs] ?? 0) - (left.want[theirs] ?? 0);
        if (diff !== 0) return diff;
        break;
      }
      case 'price-asc':
        return comparePrice(left, right, 1) || left.title.localeCompare(right.title);
      case 'price-desc':
        return comparePrice(left, right, -1) || left.title.localeCompare(right.title);
      case 'oldest':
        return left.createdAt.localeCompare(right.createdAt);
      case 'title':
        return left.title.localeCompare(right.title);
      case 'site': {
        const diff = left.site.localeCompare(right.site);
        if (diff !== 0) return diff;
        break;
      }
      case 'newest':
        break;
    }

    // Shared fallback: newest first, which is the most useful default for ties.
    return right.createdAt.localeCompare(left.createdAt);
  });
}
