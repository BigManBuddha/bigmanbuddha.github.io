/**
 * Saved data on this device (localStorage).
 * Every function tolerates storage being unavailable (private mode, quota full,
 * or Node in tests) and falls back to running in memory.
 */
import { DEFAULT_FREQUENCIES, STORAGE_KEY, UI_PREFS_KEY } from '../domain/constants';
import { defaultSettings } from '../domain/settings';
import { defaultTemplates } from '../domain/templates';
import type { PersistedState } from '../domain/types';

/** The keys that are saved and exported. Everything else is screen state. */
export const PERSISTED_KEYS = ['clients', 'waitlist', 'templates', 'pin', 'seeded', 'settings', 'onboarded'] as const;

function storage(): Storage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function defaultPersisted(): PersistedState {
  return { clients: [], waitlist: [], templates: defaultTemplates(), pin: null, seeded: false, settings: defaultSettings(), onboarded: false };
}

export function pickPersisted(source: PersistedState): PersistedState {
  const { clients, waitlist, templates, pin, seeded, settings, onboarded } = source;
  return { clients, waitlist, templates, pin, seeded, settings, onboarded };
}

export function readSavedState(): Partial<PersistedState> {
  try {
    const parsed: unknown = JSON.parse(storage()?.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Partial<PersistedState>) : {};
  } catch {
    return {};
  }
}

/** Returns false if the write failed (the app keeps running in memory). */
export function writeSavedState(state: PersistedState): boolean {
  const s = storage();
  if (!s) return false;
  try { s.setItem(STORAGE_KEY, JSON.stringify(pickPersisted(state))); return true; } catch { return false; }
}

/** Saved data merged over defaults, repairing anything malformed. */
export function loadPersistedState(): PersistedState {
  const saved = readSavedState();
  const base = defaultPersisted();
  const settings = { ...base.settings, ...(saved.settings ?? {}) };
  if (!Array.isArray(settings.frequencies)) settings.frequencies = DEFAULT_FREQUENCIES.map((f) => ({ ...f }));
  return {
    clients: Array.isArray(saved.clients) ? saved.clients : [],
    waitlist: Array.isArray(saved.waitlist) ? saved.waitlist : [],
    templates: Array.isArray(saved.templates) && saved.templates.length ? saved.templates : base.templates,
    pin: typeof saved.pin === 'string' ? saved.pin : null,
    seeded: !!saved.seeded,
    settings,
    onboarded: !!saved.onboarded,
  };
}

/** Ask the browser not to evict our data under storage pressure. Best effort, once. */
let persistenceRequested = false;
export function requestPersistentStorage(): void {
  if (persistenceRequested) return;
  persistenceRequested = true;
  try { void navigator.storage?.persist?.().catch(() => undefined); } catch { /* unsupported */ }
}

/* ---------- device-only layout preferences ---------- */

export interface UiPrefs { sidebar?: 'full' | 'rail' }

export function readUiPrefs(): UiPrefs {
  try { return JSON.parse(storage()?.getItem(UI_PREFS_KEY) || '{}') as UiPrefs; } catch { return {}; }
}

export function writeUiPrefs(prefs: UiPrefs): void {
  try { storage()?.setItem(UI_PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}
