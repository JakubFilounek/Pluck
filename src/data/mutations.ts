import { db } from './db';
import type {
  CaptureCandidate,
  Category,
  Item,
  ItemStatus,
  PersonId,
  Price,
  Tag,
  WantLevel,
} from '../domain/types';

/** All writes go through here so timestamps and invariants stay in one place. */

function now(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export type NewItemInput = {
  candidate: CaptureCandidate;
  addedBy: PersonId;
  want?: WantLevel;
  categoryId?: string;
  tagIds?: string[];
  giftFor?: PersonId;
  notes?: string;
};

export async function createItem(input: NewItemInput): Promise<Item> {
  const timestamp = now();

  const item: Item = {
    id: newId('item'),
    title: input.candidate.title,
    url: input.candidate.url,
    canonicalUrl: input.candidate.canonicalUrl,
    site: input.candidate.site,
    imageUrl: input.candidate.imageUrl,
    price: input.candidate.price,
    brand: input.candidate.brand,
    availability: input.candidate.availability,
    categoryId: input.categoryId,
    tagIds: input.tagIds ?? [],
    // The person saving it is the one whose want-rating we record; the other person
    // rates it themselves later, and an unrated item simply has no entry.
    want: input.want ? { [input.addedBy]: input.want } : {},
    status: 'wanted',
    giftFor: input.giftFor,
    addedBy: input.addedBy,
    notes: input.notes ?? input.candidate.notes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.items.add(item);
  return item;
}

type ItemPatch = Partial<Omit<Item, 'id' | 'createdAt' | 'updatedAt'>>;

export async function updateItem(id: string, patch: ItemPatch): Promise<void> {
  await db.items.update(id, { ...patch, updatedAt: now() });
}

export async function setWant(
  id: string,
  person: PersonId,
  level: WantLevel,
): Promise<void> {
  const item = await db.items.get(id);
  if (!item) return;

  const want = { ...item.want };

  // Rating 0 clears the entry rather than storing a zero, so "unrated" and
  // "deliberately rated lowest" stay distinguishable.
  if (level === 0) {
    delete want[person];
  } else {
    want[person] = level;
  }

  await updateItem(id, { want });
}

export async function markBought(
  id: string,
  boughtBy: PersonId,
  boughtPrice?: Price,
  boughtAt?: string,
): Promise<void> {
  await updateItem(id, {
    status: 'bought',
    boughtBy,
    boughtPrice,
    boughtAt: boughtAt ?? now(),
  });
}

export async function setStatus(id: string, status: ItemStatus): Promise<void> {
  // Moving away from 'bought' clears the purchase details so a mis-click doesn't
  // leave a wanted item carrying a phantom price and buyer.
  const cleared =
    status === 'bought'
      ? {}
      : { boughtBy: undefined, boughtAt: undefined, boughtPrice: undefined };

  await updateItem(id, { status, ...cleared });
}

export async function deleteItem(id: string): Promise<void> {
  const item = await db.items.get(id);
  await db.items.delete(id);

  if (item?.thumbId) {
    await db.thumbnails.delete(item.thumbId);
  }
}

export async function bulkSetStatus(ids: string[], status: ItemStatus): Promise<void> {
  await db.transaction('rw', db.items, async () => {
    for (const id of ids) await setStatus(id, status);
  });
}

export async function bulkAddTag(ids: string[], tagId: string): Promise<void> {
  await db.transaction('rw', db.items, async () => {
    for (const id of ids) {
      const item = await db.items.get(id);
      if (!item || item.tagIds.includes(tagId)) continue;
      await updateItem(id, { tagIds: [...item.tagIds, tagId] });
    }
  });
}

export async function bulkRemoveTag(ids: string[], tagId: string): Promise<void> {
  await db.transaction('rw', db.items, async () => {
    for (const id of ids) {
      const item = await db.items.get(id);
      if (!item) continue;
      await updateItem(id, { tagIds: item.tagIds.filter((value) => value !== tagId) });
    }
  });
}

export async function bulkSetCategory(ids: string[], categoryId?: string): Promise<void> {
  await db.transaction('rw', db.items, async () => {
    for (const id of ids) await updateItem(id, { categoryId });
  });
}

export async function createCategory(name: string, icon: string): Promise<Category> {
  const maxOrder = (await db.categories.orderBy('sortOrder').last())?.sortOrder ?? -1;
  const category: Category = { id: newId('cat'), name, icon, sortOrder: maxOrder + 1 };
  await db.categories.add(category);
  return category;
}

/** Deleting a category detaches it from its items rather than deleting them. */
export async function deleteCategory(categoryId: string): Promise<void> {
  await db.transaction('rw', db.categories, db.items, async () => {
    const affected = await db.items.where('categoryId').equals(categoryId).toArray();
    for (const item of affected) await updateItem(item.id, { categoryId: undefined });
    await db.categories.delete(categoryId);
  });
}

export async function createTag(name: string, color: string): Promise<Tag> {
  const maxOrder = (await db.tags.orderBy('sortOrder').last())?.sortOrder ?? -1;
  const tag: Tag = { id: newId('tag'), name, color, sortOrder: maxOrder + 1 };
  await db.tags.add(tag);
  return tag;
}

/** Deleting a tag strips it from every item that carries it. */
export async function deleteTag(tagId: string): Promise<void> {
  await db.transaction('rw', db.tags, db.items, async () => {
    const affected = await db.items.where('tagIds').equals(tagId).toArray();
    for (const item of affected) {
      await updateItem(item.id, { tagIds: item.tagIds.filter((value) => value !== tagId) });
    }
    await db.tags.delete(tagId);
  });
}
