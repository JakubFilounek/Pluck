import { db } from './db';
import {
  DEFAULT_FILTERS,
  canSeeList,
  filterItems,
  indexLists,
  isHiddenFromViewer,
  type ItemFilters,
  type ListIndex,
} from '../domain/filters';
import { sortItems, type SortMode } from '../domain/sort';
import type { Category, Item, PersonId, PluckList, Tag } from '../domain/types';

/**
 * The single read path for items.
 *
 * Every view, the search box, the badge count and the duplicate check go through
 * this module, and both visibility rules — surprise mode and private lists — are
 * applied here rather than in any component. That way a hidden item cannot leak
 * through a screen someone forgot to guard: there is exactly one place to get right.
 *
 * The one deliberate exception is exportAllItems(), which is documented below.
 */

export type ViewerContext = {
  viewer: PersonId;
  surpriseMode: boolean;
};

/** Loads the lists needed to judge visibility. */
async function listIndex(): Promise<ListIndex> {
  return indexLists(await db.lists.toArray());
}

function visibleTo(items: Item[], ctx: ViewerContext, lists: ListIndex): Item[] {
  return items.filter((item) => !isHiddenFromViewer(item, ctx.viewer, ctx.surpriseMode, lists));
}

export async function queryItems(
  ctx: ViewerContext,
  filters: ItemFilters = DEFAULT_FILTERS,
  sort: SortMode = 'want-combined',
): Promise<Item[]> {
  // Item counts here are in the hundreds, so reading the table and filtering in
  // memory is both fast enough and far simpler than composing Dexie index queries
  // for nine optional filters. Revisit only if this ever gets slow.
  const [all, lists] = await Promise.all([db.items.toArray(), listIndex()]);

  return sortItems(
    filterItems(all, filters, ctx.viewer, ctx.surpriseMode, lists),
    sort,
    ctx.viewer,
  );
}

export async function getItem(ctx: ViewerContext, id: string): Promise<Item | undefined> {
  const item = await db.items.get(id);
  if (!item) return undefined;

  const lists = await listIndex();
  return isHiddenFromViewer(item, ctx.viewer, ctx.surpriseMode, lists) ? undefined : item;
}

/**
 * Duplicate check for the capture flow.
 *
 * Note this respects visibility: if the existing copy is hidden from the current
 * viewer — a gift for them, or filed only in someone else's private list — we report
 * "no duplicate" and let a second row be created. Saying "you already saved this"
 * would give the surprise away, and a stray duplicate is the cheaper problem.
 */
export async function findDuplicate(
  ctx: ViewerContext,
  canonicalUrl: string,
): Promise<Item | undefined> {
  const matches = await db.items.where('canonicalUrl').equals(canonicalUrl).toArray();
  return visibleTo(matches, ctx, await listIndex())[0];
}

export async function countByStatus(ctx: ViewerContext): Promise<Record<string, number>> {
  const items = visibleTo(await db.items.toArray(), ctx, await listIndex());

  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, {});
}

/** Distinct shop names across visible items, for the sidebar site filter. */
export async function listSites(ctx: ViewerContext): Promise<string[]> {
  const items = visibleTo(await db.items.toArray(), ctx, await listIndex());
  return [...new Set(items.map((item) => item.site))].sort((a, b) => a.localeCompare(b));
}

/** Tag ids that are actually in use, with visible counts. */
export async function tagUsage(ctx: ViewerContext): Promise<Map<string, number>> {
  const items = visibleTo(await db.items.toArray(), ctx, await listIndex());
  const usage = new Map<string, number>();

  for (const item of items) {
    for (const tagId of item.tagIds) {
      usage.set(tagId, (usage.get(tagId) ?? 0) + 1);
    }
  }

  return usage;
}

/** Lists this person is allowed to see, in display order. */
export async function listLists(viewer: PersonId): Promise<PluckList[]> {
  const all = await db.lists.orderBy('sortOrder').toArray();
  return all.filter((list) => canSeeList(list, viewer));
}

/** Visible item counts per list, for the sidebar. */
export async function listUsage(ctx: ViewerContext): Promise<Map<string, number>> {
  const items = visibleTo(await db.items.toArray(), ctx, await listIndex());
  const usage = new Map<string, number>();

  for (const item of items) {
    for (const listId of item.listIds ?? []) {
      usage.set(listId, (usage.get(listId) ?? 0) + 1);
    }
  }

  return usage;
}

export async function listCategories(): Promise<Category[]> {
  return db.categories.orderBy('sortOrder').toArray();
}

export async function listTags(): Promise<Tag[]> {
  return db.tags.orderBy('sortOrder').toArray();
}

/**
 * Deliberately bypasses both visibility rules.
 *
 * This backs the JSON export, which — with no cloud and no sync — is the only copy
 * of this data that exists off this machine. A backup that silently dropped hidden
 * rows would lose them for good, so the export is always complete and the UI warns
 * that the file contains everything, private lists and gifts included.
 */
export async function exportAllItems(): Promise<Item[]> {
  return db.items.orderBy('createdAt').toArray();
}
