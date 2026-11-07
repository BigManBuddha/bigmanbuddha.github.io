import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, UI_PREFS_KEY } from '../domain/constants';
import { sampleCaseload } from '../domain/sample';
import { defaultSettings } from '../domain/settings';
import { defaultTemplates } from '../domain/templates';
import { fakeStorage, TODAY } from '../test/helpers';
import { backupObject, parseBackup } from './backup';
import { hashPin, pinMatches, pinProblem } from './pin';
import { loadPersistedState, readUiPrefs, writeSavedState, writeUiPrefs } from './storage';
import { isNewer } from './updates';

describe('update check', () => {
  it('compares versions numerically, not as text', () => {
    expect(isNewer('1.1.0', '1.0.9')).toBe(true);
    expect(isNewer('1.10.0', '1.9.0')).toBe(true);
    expect(isNewer('2.0.0', '1.99.99')).toBe(true);
    expect(isNewer('1.0.0', '1.0.0')).toBe(false);
    expect(isNewer('1.0.0', '1.0.1')).toBe(false);
  });
});

describe('backup files', () => {
  it('round-trip: export then import gives the same data', () => {
    const { clients, waitlist } = sampleCaseload(TODAY);
    const state = { clients, waitlist, templates: defaultTemplates(), pin: null, seeded: true, settings: defaultSettings(), onboarded: true };
    const back = parseBackup(JSON.stringify(backupObject(state)), defaultSettings());
    expect(back.clients).toEqual(clients);
    expect(back.waitlist).toEqual(waitlist);
    expect(back.settings).toEqual(state.settings);
  });

  it('rejects files that are not Slate backups', () => {
    const s = defaultSettings();
    expect(() => parseBackup('not json', s)).toThrow();
    expect(() => parseBackup('[]', s)).toThrow();
    expect(() => parseBackup('{}', s)).toThrow();
    expect(() => parseBackup('{"clients":"x"}', s)).toThrow();
    expect(() => parseBackup('{"clients":[],"settings":5}', s)).toThrow();
  });

  it('repairs records without ids and bad frequency lists', () => {
    const next = parseBackup(JSON.stringify({ clients: [{ name: 'A' }, 'junk'], settings: { frequencies: 'x' } }), defaultSettings());
    expect(next.clients).toHaveLength(1);
    expect(next.clients![0].id).toBeTruthy();
    expect(Array.isArray(next.settings!.frequencies)).toBe(true);
  });
});

describe('PIN', () => {
  it('digits only, at least 4', () => {
    expect(pinProblem('12')).not.toBe('');
    expect(pinProblem('12ab')).not.toBe('');
    expect(pinProblem('1234')).toBe('');
  });

  it('is stored hashed and checks correctly', async () => {
    const h = await hashPin('1234');
    expect(h.startsWith('sha256:')).toBe(true);
    expect(h).not.toContain('1234');
    expect(await pinMatches('1234', h)).toBe(true);
    expect(await pinMatches('9999', h)).toBe(false);
    expect(await pinMatches('1234', '1234')).toBe(true); // PINs saved before hashing still work
  });
});

describe('saved data', () => {
  let store: Storage;
  beforeEach(() => { store = fakeStorage(); vi.stubGlobal('localStorage', store); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('survives a reload', () => {
    const state = { ...loadPersistedState(), clients: sampleCaseload(TODAY).clients };
    expect(writeSavedState(state)).toBe(true);
    expect(loadPersistedState().clients).toHaveLength(14);
  });

  it('corrupt saved data does not crash; it falls back to defaults', () => {
    store.setItem(STORAGE_KEY, '{not json');
    expect(loadPersistedState().clients).toEqual([]);
    store.setItem(STORAGE_KEY, JSON.stringify({ clients: 'oops', settings: { frequencies: null } }));
    const s = loadPersistedState();
    expect(Array.isArray(s.clients)).toBe(true);
    expect(Array.isArray(s.settings.frequencies)).toBe(true);
    expect(s.templates).toHaveLength(7);
  });

  it('layout preferences are kept separately from saved data', () => {
    writeUiPrefs({ sidebar: 'rail' });
    expect(readUiPrefs().sidebar).toBe('rail');
    expect(store.getItem(UI_PREFS_KEY)).toContain('rail');
    expect(store.getItem(STORAGE_KEY)).toBeNull();
  });
});
