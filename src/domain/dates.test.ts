import { describe, expect, it } from 'vitest';
import { addDays, diffDays, isoWeekNumber, mondayOf, parseIso, toIso } from './dates';
import { trimNum } from './format';
import { TODAY } from '../test/helpers';

describe('dates', () => {
  it('parseIso reads YYYY-MM-DD at noon and rejects junk', () => {
    const d = parseIso('2026-10-28')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 28, 12]);
    expect(parseIso('')).toBeNull();
    expect(parseIso(null)).toBeNull();
    expect(parseIso('abc')).toBeNull();
    expect(parseIso('2026-xx-01')).toBeNull();
  });

  it('toIso round-trips with parseIso', () => {
    expect(toIso(parseIso('2026-01-05'))).toBe('2026-01-05');
    expect(toIso(null)).toBe('');
  });

  it('is not shifted by the clocks changing (UK DST, 29 Mar 2026)', () => {
    const before = parseIso('2026-03-28')!;
    expect(toIso(addDays(before, 1))).toBe('2026-03-29');
    expect(toIso(addDays(before, 2))).toBe('2026-03-30');
    expect(diffDays(parseIso('2026-03-30')!, before)).toBe(2);
  });

  it('mondayOf returns the Monday of the same week (Sunday belongs to the week before)', () => {
    expect(toIso(mondayOf(TODAY))).toBe('2026-10-26');
    expect(toIso(mondayOf(parseIso('2026-11-01')!))).toBe('2026-10-26');
    expect(toIso(mondayOf(parseIso('2026-10-26')!))).toBe('2026-10-26');
  });

  it('isoWeekNumber matches the calendar', () => {
    expect(isoWeekNumber(TODAY)).toBe(44);
    expect(isoWeekNumber(parseIso('2026-01-01')!)).toBe(1);
    expect(isoWeekNumber(parseIso('2027-01-01')!)).toBe(53);
  });

  it('trimNum keeps at most two decimals', () => {
    expect(trimNum(1 / 3)).toBe('0.33');
    expect(trimNum(2)).toBe('2');
    expect(trimNum(7.0800000001)).toBe('7.08');
  });
});
