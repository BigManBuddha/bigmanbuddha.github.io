/** Shared helpers for tests. A fixed "today" keeps results independent of the clock. */
import { addDays, mondayOf, toIso } from '../domain/dates';
import { computeClient } from '../domain/caseload';
import { defaultSettings } from '../domain/settings';
import type { Client, Settings } from '../domain/types';
import { initialAppState, type AppState, type Patch } from '../state/appState';
import { defaultPersisted } from '../services/storage';

/** Wednesday 28 Oct 2026, noon. Its Monday is 26 Oct. */
export const TODAY = new Date(2026, 9, 28, 12);
export const MONDAY = mondayOf(TODAY);

/** ISO date `offset` days from this week's Monday. */
export const day = (offset: number) => toIso(addDays(MONDAY, offset));

export function makeClient(over: Partial<Client> = {}): Client {
  return {
    id: `c${Math.random()}`, name: 'Test', contact: '', frequency: 'Weekly',
    blockStart: day(0), blockLength: 6, pushedBack: 0, status: 'Active',
    replyBy: '', rebook: '', decided: false, notes: '',
    ...over,
  };
}

export function compute(over: Partial<Client> = {}, settings: Settings = defaultSettings()) {
  return computeClient(makeClient(over), settings, TODAY);
}

export function makeState(over: Partial<AppState> = {}): AppState {
  return { ...initialAppState(defaultPersisted()), onboardOpen: false, ...over };
}

/** Apply a sequence of patches, like the app does. */
export function apply(state: AppState, ...patches: Patch[]): AppState {
  return patches.reduce<AppState>((s, p) => ({ ...s, ...p }), state);
}

/** In-memory stand-in for localStorage. */
export function fakeStorage(): Storage {
  let data: Record<string, string> = {};
  return {
    get length() { return Object.keys(data).length; },
    key: (i: number) => Object.keys(data)[i] ?? null,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = String(v); },
    removeItem: (k: string) => { delete data[k]; },
    clear: () => { data = {}; },
  };
}
