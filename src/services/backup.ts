/** Backup files: building, reading (with validation) and downloading. */
import { APP_NAME } from '../domain/constants';
import { newId } from '../domain/format';
import type { PersistedState, Settings } from '../domain/types';
import { pickPersisted } from './storage';

export function backupObject(state: PersistedState): PersistedState & { exportedAt: string; app: string } {
  return { ...pickPersisted(state), exportedAt: new Date().toISOString(), app: APP_NAME };
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

/** Keep only objects, and make sure every record has an id (old or hand-edited files may not). */
function cleanRecords<T>(list: unknown[], idPrefix: string): T[] {
  return list.filter(isPlainObject).map((r) => ({ ...r, id: (r.id as string) || newId(idPrefix) }) as T);
}

/**
 * Read an uploaded backup. Returns only known keys.
 * Throws if the file isn't a Slate backup, so nothing half-valid is ever applied.
 */
export function parseBackup(text: string, currentSettings: Settings): Partial<PersistedState> {
  const data: unknown = JSON.parse(text);
  if (!isPlainObject(data)) throw new Error('Backup is not an object');
  if (!Array.isArray(data.clients) && !Array.isArray(data.waitlist)) throw new Error('No Slate data in file');

  for (const key of ['clients', 'waitlist', 'templates']) {
    if (key in data && !Array.isArray(data[key])) throw new Error(`${key} is not a list`);
  }
  if ('settings' in data && !isPlainObject(data.settings)) throw new Error('settings is not an object');

  const next: Partial<PersistedState> = {};
  if (Array.isArray(data.clients)) next.clients = cleanRecords(data.clients, 'c');
  if (Array.isArray(data.waitlist)) next.waitlist = cleanRecords(data.waitlist, 'w');
  if (Array.isArray(data.templates)) {
    const templates = cleanRecords<PersistedState['templates'][number]>(data.templates, 't');
    if (templates.length) next.templates = templates;
  }
  if (isPlainObject(data.settings)) {
    const settings = { ...currentSettings, ...(data.settings as Partial<Settings>) };
    if (!Array.isArray(settings.frequencies)) settings.frequencies = currentSettings.frequencies;
    next.settings = settings;
  }
  if ('pin' in data) next.pin = typeof data.pin === 'string' ? data.pin : null;
  if ('seeded' in data) next.seeded = !!data.seeded;
  if ('onboarded' in data) next.onboarded = !!data.onboarded;
  return next;
}

export function downloadJson(obj: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
