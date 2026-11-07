import { describe, expect, it } from 'vitest';
import {
  availabilityByFrequency, blockProgress, clientButtons, endsRelative, forecastDecisions, forecastWeek,
  slotsBestCaseAt, slotsUsedAt, waitDueText, waitlistDue, weekStartsFrom,
} from './caseload';
import { addDays, parseIso, toIso } from './dates';
import { sampleCaseload } from './sample';
import { defaultSettings, forecastWeeks, leadWeeks, targetSlots } from './settings';
import { compute, day, makeClient, TODAY } from '../test/helpers';

const withSettings = (patch: object) => ({ ...defaultSettings(), ...patch });

describe('settings readers', () => {
  it('leadWeeks: blank or invalid falls back to 2, zero is allowed', () => {
    expect(leadWeeks(withSettings({ lead: '' }))).toBe(2);
    expect(leadWeeks(withSettings({ lead: 'abc' }))).toBe(2);
    expect(leadWeeks(withSettings({ lead: '-1' }))).toBe(2);
    expect(leadWeeks(withSettings({ lead: '0' }))).toBe(0);
    expect(leadWeeks(withSettings({ lead: '3' }))).toBe(3);
  });

  it('targetSlots never goes negative', () => {
    expect(targetSlots(withSettings({ target: '-3' }))).toBe(0);
    expect(targetSlots(withSettings({ target: '' }))).toBe(0);
    expect(targetSlots(withSettings({ target: '8' }))).toBe(8);
  });

  it('forecastWeeks is clamped to 1–26', () => {
    expect(forecastWeeks(withSettings({ weeks: '40' }))).toBe(26);
    expect(forecastWeeks(withSettings({ weeks: '' }))).toBe(12);
    expect(forecastWeeks(withSettings({ weeks: '0' }))).toBe(12);
    expect(forecastWeeks(withSettings({ weeks: '4' }))).toBe(4);
  });
});

describe('block progress', () => {
  it('block started this week: first session counts as used', () => {
    const p = blockProgress(makeClient({ blockStart: day(0), blockLength: 6 }), 1, TODAY);
    expect(p.sessionsLeft).toBe(5);
    expect(toIso(p.blockEnds)).toBe('2026-11-30');
  });

  it('block not started yet: nothing used', () => {
    expect(blockProgress(makeClient({ blockStart: day(7) }), 1, TODAY).sessionsLeft).toBe(6);
  });

  it('block finished: zero left, never negative', () => {
    expect(blockProgress(makeClient({ blockStart: day(-70) }), 1, TODAY).sessionsLeft).toBe(0);
  });

  it('pushed-back weeks move the end date and the count', () => {
    const p = blockProgress(makeClient({ blockStart: day(-35), pushedBack: 1 }), 1, TODAY);
    expect(p.sessionsLeft).toBe(1);
    expect(toIso(p.blockEnds)).toBe('2026-11-02');
  });

  it('fortnightly block ends (length − 1) × 2 weeks after start', () => {
    expect(toIso(blockProgress(makeClient({ blockLength: 5 }), 2, TODAY).blockEnds)).toBe('2026-12-21');
  });

  it('missing start date or length gives no end date', () => {
    expect(blockProgress(makeClient({ blockStart: '' }), 1, TODAY).blockEnds).toBeNull();
    expect(blockProgress(makeClient({ blockLength: 0 }), 1, TODAY).sessionsLeft).toBeNull();
  });
});

describe('client actions', () => {
  it.each([
    ['discharged → done', { status: 'Discharged' as const }, 'done'],
    ['holding without reply-by → set-reply', { status: 'Holding' as const }, 'set-reply'],
    ['holding, reply-by in future → awaiting', { status: 'Holding' as const, replyBy: day(10) }, 'awaiting'],
    ['holding, reply-by today → chase', { status: 'Holding' as const, replyBy: toIso(TODAY) }, 'chase'],
    ['no block details → fill', { blockLength: 0 }, 'fill'],
    ['block over → ended', { blockStart: day(-70) }, 'ended'],
    ['block over but decided → decided', { blockStart: day(-70), decided: true }, 'decided'],
    ['ends inside lead window → decide', { blockStart: day(-21) }, 'decide'],
    ['ends inside double lead window → review', { blockStart: day(-7) }, 'review'],
    ['plenty of block left → ok', { blockLength: 12 }, 'ok'],
  ])('%s', (_, over, expected) => {
    expect(compute(over).action).toBe(expected);
  });

  it('a blank lead setting uses the same 2 weeks as Invite back', () => {
    expect(compute({ blockStart: day(-21) }, withSettings({ lead: '' })).action).toBe('decide');
  });

  it('an unknown frequency name falls back to weekly load', () => {
    const c = compute({ frequency: 'Gone' });
    expect([c.load, c.gap]).toEqual([1, 1]);
  });

  it('each action offers the right buttons', () => {
    expect(clientButtons('ended').map((b) => b.command)).toEqual(['invite', 'mark-decided']);
    expect(clientButtons('chase').map((b) => b.command)).toEqual(['chase', 'release']);
    expect(clientButtons('done').map((b) => b.command)).toEqual(['reactivate']);
    expect(clientButtons('ok')).toEqual([]);
  });
});

describe('slots & forecast', () => {
  const caseload = () => [
    compute({ name: 'A', blockLength: 12 }),
    compute({ name: 'B', frequency: 'Fortnightly', blockLength: 5 }),
    compute({ name: 'C', status: 'Holding', replyBy: day(10) }),
    compute({ name: 'D', status: 'Discharged' }),
    compute({ name: 'E', blockStart: day(-21), rebook: 'Likely to finish' }),
    compute({ name: 'F', blockStart: day(-21), rebook: 'Likely to continue' }),
    compute({ name: 'G', blockStart: day(-21), rebook: '' }),
  ];

  it('slotsUsedAt today: active + holding, discharged excluded', () => {
    expect(slotsUsedAt(caseload(), TODAY)).toBeCloseTo(1 + 0.5 + 1 + 1 + 1 + 1);
  });

  it('after blocks end, only "likely to finish" frees the slot', () => {
    expect(slotsUsedAt(caseload(), parseIso('2026-11-16')!)).toBeCloseTo(1 + 0.5 + 1 + 1 + 1);
  });

  it('best case: only "likely to continue" stays; holding counts as released', () => {
    expect(slotsBestCaseAt(caseload(), parseIso('2026-11-16')!)).toBeCloseTo(1 + 0.5 + 1);
  });

  it('availability: first week a new weekly client can safely start', () => {
    const list = [compute({ name: 'E', blockStart: day(-21), rebook: 'Likely to finish' })];
    const weekly = availabilityByFrequency(list, defaultSettings().frequencies, weekStartsFrom(TODAY, 4), 1)[0];
    expect(weekly.tone).toBe('amber');
    expect(weekly.text).toContain('16 Nov');
  });

  it('availability: now when under target; full when never free', () => {
    const weeks = weekStartsFrom(TODAY, 4);
    const freqs = defaultSettings().frequencies;
    expect(availabilityByFrequency([], freqs, weeks, 2)[0].tone).toBe('green');
    expect(availabilityByFrequency([compute({ blockLength: 20 })], freqs, weeks, 1)[0].tone).toBe('red');
  });

  it('a forecast week lists who ends and who to chase', () => {
    expect(forecastDecisions(forecastWeek(caseload(), parseIso('2026-11-09')!, 8))).toContain('Ends: E, F, G');
    expect(forecastDecisions(forecastWeek(caseload(), parseIso('2026-11-02')!, 8))).toContain('Chase: C');
  });
});

describe('labels & waitlist', () => {
  it('endsRelative labels', () => {
    expect(endsRelative(addDays(TODAY, -1), TODAY).text).toBe('ended');
    expect(endsRelative(TODAY, TODAY).text).toBe('today');
    expect(endsRelative(addDays(TODAY, 5), TODAY).text).toBe('in 5d');
    expect(endsRelative(addDays(TODAY, 21), TODAY).text).toBe('in 3w');
    expect(endsRelative(null, TODAY).text).toBe('');
  });

  it('never-contacted families say so (not "999 days")', () => {
    const due = waitlistDue([{ id: 'w1', name: 'X', need: 'Weekly', added: '', lastContacted: '', notes: '' }], TODAY);
    expect(due).toHaveLength(1);
    expect(waitDueText(due[0].days)).toBe('Never contacted');
  });

  it('due after 14 days, not before', () => {
    const entry = (offset: number) => ({ id: 'w', name: 'X', need: 'Weekly', added: '', lastContacted: toIso(addDays(TODAY, offset)), notes: '' });
    expect(waitlistDue([entry(-13)], TODAY)).toHaveLength(0);
    expect(waitlistDue([entry(-14)], TODAY)).toHaveLength(1);
  });
});

describe('sample caseload', () => {
  it('shows every important state, with unique ids', () => {
    const { clients, waitlist } = sampleCaseload(TODAY);
    expect(clients).toHaveLength(14);
    expect(waitlist).toHaveLength(4);
    const actions = new Set(clients.map((c) => compute(c).action));
    expect([...actions]).toEqual(expect.arrayContaining(['ended', 'decide', 'chase', 'awaiting', 'review', 'ok', 'done']));
    expect(new Set(clients.map((c) => c.id)).size).toBe(clients.length);
  });
});
