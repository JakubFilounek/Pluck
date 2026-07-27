import Dexie, { type EntityTable } from 'dexie';
import type { Category, Item, Tag } from '../domain/types';

/**
 * IndexedDB via Dexie, not a single storage.local JSON blob. Two reasons:
 * a blob has to be rewritten in full on every edit, and it can't hold image data
 * once optional thumbnail caching is switched on.
 */

export type Thumbnail = {
  id: string;
  blob: Blob;
  createdAt: string;
};

export type PluckDatabase = Dexie & {
  items: EntityTable<Item, 'id'>;
  categories: EntityTable<Category, 'id'>;
  tags: EntityTable<Tag, 'id'>;
  thumbnails: EntityTable<Thumbnail, 'id'>;
};

export const db = new Dexie('pluck') as PluckDatabase;

db.version(1).stores({
  // canonicalUrl is indexed because every capture does a duplicate lookup on it.
  // tagIds is a multi-entry index so tag filtering doesn't scan the whole table.
  items: 'id, canonicalUrl, status, categoryId, *tagIds, site, giftFor, addedBy, createdAt, updatedAt',
  categories: 'id, name, sortOrder',
  tags: 'id, name, sortOrder',
  thumbnails: 'id',
});

// `icon` holds a name from src/ui/icons.ts, not a glyph — see the note on the
// Category type. Unknown names resolve to the box icon rather than rendering blank.
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-electronics', name: 'Electronics', icon: 'laptop', sortOrder: 0 },
  { id: 'cat-home', name: 'Home', icon: 'home', sortOrder: 1 },
  { id: 'cat-kitchen', name: 'Kitchen', icon: 'kitchen', sortOrder: 2 },
  { id: 'cat-clothing', name: 'Clothing', icon: 'clothing', sortOrder: 3 },
  { id: 'cat-beauty', name: 'Beauty', icon: 'beauty', sortOrder: 4 },
  { id: 'cat-books', name: 'Books & Media', icon: 'book', sortOrder: 5 },
  { id: 'cat-hobby', name: 'Hobby & Sport', icon: 'hobby', sortOrder: 6 },
  { id: 'cat-garden', name: 'Garden', icon: 'garden', sortOrder: 7 },
  { id: 'cat-other', name: 'Other', icon: 'box', sortOrder: 8 },
];

export const DEFAULT_TAGS: Tag[] = [
  { id: 'tag-christmas', name: 'Christmas', color: '#c0392b', sortOrder: 0 },
  { id: 'tag-birthday', name: 'Birthday', color: '#d35400', sortOrder: 1 },
  { id: 'tag-nameday', name: 'Nameday', color: '#8e44ad', sortOrder: 2 },
  { id: 'tag-anniversary', name: 'Anniversary', color: '#c2185b', sortOrder: 3 },
  { id: 'tag-someday', name: 'Someday', color: '#2c7873', sortOrder: 4 },
  { id: 'tag-onsale', name: 'On sale', color: '#00838f', sortOrder: 5 },
];

/**
 * Seeds the starter categories and tags exactly once. Uses add() per row and swallows
 * constraint errors so a second call can never duplicate or overwrite rows the user
 * has since renamed or deleted.
 */
export async function seedDefaults(): Promise<void> {
  const [categoryCount, tagCount] = await Promise.all([
    db.categories.count(),
    db.tags.count(),
  ]);

  if (categoryCount === 0) {
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  }

  if (tagCount === 0) {
    await db.tags.bulkAdd(DEFAULT_TAGS);
  }
}
