/**
 * Date helpers. Every date is pinned to 12:00 local time so daylight-saving
 * changes can never move it onto a different day. Stored dates are 'YYYY-MM-DD'.
 */

const DAY_MS = 86_400_000;

export function todayNoon(): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

export function parseIso(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const parts = String(iso).split('-');
  if (parts.length < 3) return null;
  const d = new Date(+parts[0], +parts[1] - 1, +parts[2], 12);
  return isNaN(d.getTime()) ? null : d;
}

export function toIso(d: Date | null | undefined): string {
  if (!d) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Whole days from b to a. */
export function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / DAY_MS);
}

export function mondayOf(d: Date): Date {
  const weekday = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(d, -weekday);
}

/** ISO-8601 week number: weeks start Monday; week 1 contains the first Thursday. */
export function isoWeekNumber(d: Date): number {
  const thursday = addDays(mondayOf(d), 3);
  const jan1 = new Date(thursday.getFullYear(), 0, 1, 12);
  return Math.floor(diffDays(thursday, jan1) / 7) + 1;
}

/** "Mon 26 Oct" */
export function fmtShort(d: Date | null | undefined): string {
  return d ? d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) : '';
}

/** "Monday 26 October" */
export function fmtLong(d: Date | null | undefined): string {
  return d ? d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
}
