/**
 * Reading settings safely. Settings come from text inputs, so a value may be
 * '', 'abc' or negative while the user is typing. Always read them through these.
 */
import { DEFAULT_SETTINGS, MAX_FORECAST_WEEKS } from './constants';
import type { Settings } from './types';

export function defaultSettings(): Settings {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as Settings;
}

/** Slot load and session gap for a frequency name. Unknown names count as weekly. */
export function findFrequency(settings: Settings, name: string): { load: number; gap: number } {
  const f = settings.frequencies.find((x) => x.name === name);
  if (!f) return { load: 1, gap: 1 };
  return { load: +f.load || 0, gap: +f.gap || 1 };
}

/** Weeks of warning before a block ends. Blank/invalid → default; 0 is allowed. */
export function leadWeeks(settings: Settings): number {
  const n = parseFloat(String(settings.lead));
  return isFinite(n) && n >= 0 ? n : Number(DEFAULT_SETTINGS.lead);
}

/** Target slots per week. Never negative. */
export function targetSlots(settings: Settings): number {
  const n = parseFloat(String(settings.target));
  return isFinite(n) && n > 0 ? n : 0;
}

/** Forecast length in weeks, clamped to 1–26. */
export function forecastWeeks(settings: Settings): number {
  const n = parseInt(String(settings.weeks), 10);
  const weeks = isFinite(n) && n > 0 ? n : Number(DEFAULT_SETTINGS.weeks);
  return Math.max(1, Math.min(MAX_FORECAST_WEEKS, weeks));
}
