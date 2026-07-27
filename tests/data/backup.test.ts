import { describe, expect, it } from 'vitest';
import { backupIsStale, importBackup } from '@/src/data/backup';
import { DEFAULT_SETTINGS, type Settings } from '@/src/settings';

/**
 * Covers the parts of the backup layer that run before any database access — the
 * validation gate. A bad file has to be rejected with a clear message rather than
 * half-imported, since this is the recovery path for the only copy of the data.
 */

function settingsWith(patch: Partial<Settings>): Settings {
  return { ...DEFAULT_SETTINGS, ...patch };
}

describe('importBackup validation', () => {
  it('rejects input that is not JSON', async () => {
    await expect(importBackup('not json at all')).rejects.toThrow('not valid JSON');
  });

  it('rejects JSON that is not a Pluck backup', async () => {
    await expect(importBackup('{"some":"object"}')).rejects.toThrow('Pluck backup');
  });

  it('rejects a backup missing its items array', async () => {
    await expect(importBackup('{"format":"pluck-backup","version":1}')).rejects.toThrow(
      'Pluck backup',
    );
  });

  it('refuses a backup from a newer version rather than dropping fields it cannot read', async () => {
    const future = JSON.stringify({ format: 'pluck-backup', version: 99, items: [] });

    await expect(importBackup(future)).rejects.toThrow('newer version');
  });
});

describe('backupIsStale', () => {
  const monthsAgo = (count: number) =>
    new Date(Date.now() - count * 30 * 24 * 60 * 60 * 1000).toISOString();

  it('does not nag when there is nothing to lose', () => {
    expect(backupIsStale(settingsWith({}), 0)).toBe(false);
  });

  it('nags when data exists and no export has ever been taken', () => {
    expect(backupIsStale(settingsWith({}), 5)).toBe(true);
  });

  it('stays quiet after a recent export', () => {
    expect(backupIsStale(settingsWith({ lastExportAt: new Date().toISOString() }), 5)).toBe(false);
  });

  it('nags again once the last export is over a month old', () => {
    expect(backupIsStale(settingsWith({ lastExportAt: monthsAgo(2) }), 5)).toBe(true);
  });
});
