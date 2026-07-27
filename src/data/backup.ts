import { db } from './db';
import { exportAllItems } from './queries';
import { loadSettings, saveSettings, type Settings } from '../settings';
import type { Category, Item, Tag } from '../domain/types';

/**
 * JSON backup.
 *
 * With no cloud and no sync, this file is the only copy of the data that exists off
 * this machine — so the export is deliberately complete, including gift items hidden
 * by surprise mode. A backup that silently dropped rows would lose them for good.
 * The UI says so plainly next to the button.
 */

export const BACKUP_VERSION = 1;

export type BackupFile = {
  format: 'pluck-backup';
  version: number;
  exportedAt: string;
  items: Item[];
  categories: Category[];
  tags: Tag[];
  settings: Pick<Settings, 'personNames' | 'defaultCurrency'>;
};

export async function buildBackup(): Promise<BackupFile> {
  const [items, categories, tags, settings] = await Promise.all([
    exportAllItems(),
    db.categories.toArray(),
    db.tags.toArray(),
    loadSettings(),
  ]);

  return {
    format: 'pluck-backup',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    items,
    categories,
    tags,
    settings: {
      personNames: settings.personNames,
      defaultCurrency: settings.defaultCurrency,
    },
  };
}

/** Triggers a download and records the date so the staleness nag can reset. */
export async function downloadBackup(): Promise<void> {
  const backup = await buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `pluck-backup-${backup.exportedAt.slice(0, 10)}.json`;
  anchor.click();

  URL.revokeObjectURL(url);
  await saveSettings({ lastExportAt: backup.exportedAt });
}

export type ImportResult = {
  itemsAdded: number;
  itemsSkipped: number;
  categoriesAdded: number;
  tagsAdded: number;
};

function isBackupFile(value: unknown): value is BackupFile {
  if (typeof value !== 'object' || value === null) return false;
  const file = value as Partial<BackupFile>;
  return file.format === 'pluck-backup' && Array.isArray(file.items);
}

/**
 * Merges a backup into the current database.
 *
 * Merge rather than replace: importing on a machine that already has data should
 * never silently destroy it. Rows whose id already exists are skipped, so importing
 * the same file twice is a no-op rather than a way to duplicate the whole list.
 */
export async function importBackup(json: string): Promise<ImportResult> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  if (!isBackupFile(parsed)) {
    throw new Error('That does not look like a Pluck backup file.');
  }

  if (parsed.version > BACKUP_VERSION) {
    throw new Error(
      `This backup was written by a newer version of Pluck (v${parsed.version}). Update the extension first.`,
    );
  }

  const result: ImportResult = {
    itemsAdded: 0,
    itemsSkipped: 0,
    categoriesAdded: 0,
    tagsAdded: 0,
  };

  await db.transaction('rw', db.items, db.categories, db.tags, async () => {
    for (const category of parsed.categories ?? []) {
      if (await db.categories.get(category.id)) continue;
      await db.categories.add(category);
      result.categoriesAdded += 1;
    }

    for (const tag of parsed.tags ?? []) {
      if (await db.tags.get(tag.id)) continue;
      await db.tags.add(tag);
      result.tagsAdded += 1;
    }

    for (const item of parsed.items) {
      if (await db.items.get(item.id)) {
        result.itemsSkipped += 1;
        continue;
      }

      // Guard against a hand-edited file: a missing tagIds array would break every
      // filter that reads it.
      await db.items.add({ ...item, tagIds: item.tagIds ?? [], want: item.want ?? {} });
      result.itemsAdded += 1;
    }
  });

  return result;
}

/** True when there is data worth backing up and the last export is over a month old. */
export function backupIsStale(settings: Settings, itemCount: number): boolean {
  if (itemCount === 0) return false;
  if (!settings.lastExportAt) return true;

  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return new Date(settings.lastExportAt).getTime() < monthAgo;
}
