/**
 * Everything the screens show that is worked out from saved data.
 * Computed once per change (memoised in SlateProvider), never stored.
 */
import { RETENTION_DAYS, STATUS } from '../domain/constants';
import {
  availabilityByFrequency, capacityTone, computeClient, forecastScale, forecastWeek, isComingUp,
  isStaleDischarge, isUrgent, slotsUsedAt, waitlistDue, weekStartsFrom,
  type Availability, type ForecastWeek, type WaitDue,
} from '../domain/caseload';
import { addDays } from '../domain/dates';
import { plural, trimNum } from '../domain/format';
import { forecastWeeks, targetSlots } from '../domain/settings';
import type { ComputedClient, PersistedState, Tone, ViewKey } from '../domain/types';

export interface DerivedView {
  computed: ComputedClient[];
  urgent: ComputedClient[];
  soft: ComputedClient[];
  holdingCount: number;
  target: number;
  weeks: number;
  usedNow: number;
  freeNow: number;
  availability: Availability[];
  waitDue: WaitDue[];
  forecast: ForecastWeek[];
  forecastScale: number;
  staleCount: number;
  badges: Partial<Record<ViewKey, number>>;
}

export function deriveView(p: Pick<PersistedState, 'clients' | 'waitlist' | 'settings'>, today: Date): DerivedView {
  const computed = p.clients.filter((c) => !c.archived).map((c) => computeClient(c, p.settings, today));
  const target = targetSlots(p.settings);
  const weeks = forecastWeeks(p.settings);
  const weekStarts = weekStartsFrom(today, weeks);
  const usedNow = slotsUsedAt(computed, today);
  const urgent = computed.filter(isUrgent);
  const waitDue = waitlistDue(p.waitlist, today);
  const forecast = weekStarts.map((ws) => forecastWeek(computed, ws, target));
  const cutoff = addDays(today, -RETENTION_DAYS);

  return {
    computed,
    urgent,
    soft: computed.filter(isComingUp),
    holdingCount: computed.filter((c) => c.status === STATUS.HOLDING).length,
    target,
    weeks,
    usedNow,
    freeNow: Math.max(0, target - usedNow),
    availability: availabilityByFrequency(computed, p.settings.frequencies, weekStarts, target),
    waitDue,
    forecast,
    forecastScale: forecastScale(forecast, target),
    staleCount: computed.filter((c) => isStaleDischarge(c, cutoff)).length,
    badges: { week: urgent.length, waitlist: waitDue.length },
  };
}

/* ---------- headline figures ---------- */

export interface StatData {
  label: string;
  value: string;
  unit: string;
  sub: string;
  tone: Tone;
  /** 0–100 to draw a bar under the figure. */
  barPct?: number;
}

export function weekStats(d: DerivedView): StatData[] {
  const diff = d.target - d.usedNow;
  const usedSub = diff > 0 ? `${trimNum(diff)} under target` : diff < 0 ? `${trimNum(-diff)} over target` : 'Exactly at target';
  const need = d.urgent.length;
  const due = d.waitDue.length;
  return [
    { label: 'Slots used', value: trimNum(d.usedNow), unit: `of ${d.target}`, sub: usedSub, tone: capacityTone(d.usedNow, d.target), barPct: d.target ? (d.usedNow / d.target) * 100 : 0 },
    { label: 'Safe to offer', value: trimNum(d.freeNow), unit: 'slots', sub: d.freeNow > 0 ? 'You can take someone new' : 'No space to promise this week', tone: d.freeNow > 0 ? 'green' : 'grey' },
    { label: 'Act now', value: String(need), unit: plural(need, 'client', 'clients'), sub: need > 0 ? 'Blocks ending or replies overdue' : 'Nothing urgent', tone: need > 0 ? 'red' : 'green' },
    { label: 'Awaiting reply', value: String(d.holdingCount), unit: 'held', sub: 'Slots held until families reply', tone: d.holdingCount > 0 ? 'amber' : 'grey' },
    { label: 'Waitlist due', value: String(due), unit: plural(due, 'family', 'families'), sub: 'Not contacted for 2+ weeks', tone: due > 0 ? 'amber' : 'grey' },
  ];
}

/** The three figures shown in step 2 of the weekly review. */
export function reviewStats(d: DerivedView): StatData[] {
  return [
    { label: 'Slots used', value: trimNum(d.usedNow), unit: '', sub: `of ${d.target} target`, tone: capacityTone(d.usedNow, d.target) },
    { label: 'Safe to offer', value: trimNum(d.freeNow), unit: '', sub: 'Can be promised now', tone: d.freeNow > 0 ? 'green' : 'grey' },
    { label: 'Awaiting reply', value: String(d.holdingCount), unit: '', sub: 'Slots on hold', tone: d.holdingCount > 0 ? 'amber' : 'grey' },
  ];
}
