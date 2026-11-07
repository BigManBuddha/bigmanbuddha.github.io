/**
 * Caseload maths. Pure functions only: same input, same output, no side effects.
 *
 * A "slot" is one weekly session's worth of capacity. A fortnightly client uses
 * 0.5 of a slot, and so on (the `load` of each frequency).
 */
import {
  ACTION_META, REBOOK, SOFT_ACTIONS, STATUS, URGENT_ACTIONS,
  WAITLIST_DUE_DAYS, WAITLIST_OVERDUE_DAYS, ROLE,
} from './constants';
import { addDays, diffDays, fmtShort, mondayOf, parseIso } from './dates';
import { trimNum } from './format';
import { findFrequency, leadWeeks } from './settings';
import type {
  ActionKey, Client, ClientDraft, ComputedClient, Frequency, Role, Settings, Tone, WaitlistEntry,
} from './types';

/* ---------- one client ---------- */

export interface BlockProgress {
  sessionsLeft: number | null;
  blockEnds: Date | null;
  length: number;
}

/** Sessions left in the block and the date of its last session. */
export function blockProgress(client: Pick<Client, 'name' | 'blockStart' | 'blockLength' | 'pushedBack'>, gapWeeks: number, today: Date): BlockProgress {
  const start = parseIso(client.blockStart);
  const length = +client.blockLength || 0;
  const pushed = +client.pushedBack || 0;
  if (!client.name || !length) return { sessionsLeft: null, blockEnds: null, length };

  let sessionsLeft = length;
  let blockEnds: Date | null = null;
  if (start) {
    const elapsed = diffDays(today, start) - pushed * 7;
    const used = elapsed < 0 ? 0 : Math.min(length, Math.floor(elapsed / (gapWeeks * 7)) + 1);
    sessionsLeft = length - used;
    blockEnds = addDays(start, (length - 1) * gapWeeks * 7 + pushed * 7);
  }
  return { sessionsLeft, blockEnds, length };
}

/** The single action a client needs today. */
export function clientAction(client: Pick<Client, 'status' | 'replyBy' | 'decided'>, progress: BlockProgress, lead: number, today: Date): ActionKey {
  if (client.status === STATUS.DISCHARGED) return 'done';

  if (client.status === STATUS.HOLDING) {
    const replyBy = parseIso(client.replyBy);
    if (!replyBy) return 'set-reply';
    return today >= replyBy ? 'chase' : 'awaiting';
  }

  const { sessionsLeft, blockEnds } = progress;
  if (sessionsLeft === null || blockEnds === null) return 'fill';
  if (sessionsLeft <= 0 || blockEnds < today) return client.decided ? 'decided' : 'ended';
  if (blockEnds <= addDays(today, lead * 7)) return client.decided ? 'decided' : 'decide';
  if (blockEnds <= addDays(today, lead * 14)) return 'review';
  return 'ok';
}

export function computeClient(client: Client, settings: Settings, today: Date): ComputedClient {
  const { load, gap } = findFrequency(settings, client.frequency);
  const progress = blockProgress(client, gap, today);
  return {
    ...client,
    load,
    gap,
    action: clientAction(client, progress, leadWeeks(settings), today),
    sessionsLeft: progress.sessionsLeft,
    blockEnds: progress.blockEnds,
    len: progress.length,
  };
}

/** One-line explanation shown under a client's name. */
export function clientSubtitle(c: ComputedClient): string {
  const ends = fmtShort(c.blockEnds);
  const reply = fmtShort(parseIso(c.replyBy));
  switch (c.action) {
    case 'ended': return `Block finished ${ends}. Invite them to re-book before offering the slot on.`;
    case 'decide': return `Block ends ${ends}. Decide whether it continues.`;
    case 'chase': return `Reply-by (${reply}) has passed. Chase, or release the slot.`;
    case 'awaiting': return `Holding their slot until ${reply}.`;
    case 'set-reply': return 'On hold. Set a reply-by date to ring-fence the slot.';
    case 'review': return `Block ends ${ends}.`;
    default: return c.notes || '';
  }
}

/** "Weekly · 3 of 6 left · Priya (mum)" */
export function clientMetaLine(c: ComputedClient): string {
  const sessions = c.sessionsLeft === null ? '' : `${c.sessionsLeft} of ${c.len} left`;
  return [c.frequency, sessions, c.contact || c.notes].filter(Boolean).join(' · ');
}

/** "ended" / "today" / "in 5d" / "in 3w" next to a block-end date. */
export function endsRelative(blockEnds: Date | null, today: Date): { text: string; tone: Tone } {
  if (!blockEnds) return { text: '', tone: 'grey' };
  const days = diffDays(blockEnds, today);
  if (days < 0) return { text: 'ended', tone: 'red' };
  if (days === 0) return { text: 'today', tone: 'red' };
  if (days < 14) return { text: `in ${days}d`, tone: 'amber' };
  return { text: `in ${Math.round(days / 7)}w`, tone: 'grey' };
}

/** Summary under the client form, e.g. "This client 5 of 6 sessions left · block ends …". */
export function draftSummary(draft: ClientDraft, settings: Settings, today: Date): string {
  const length = +draft.blockLength || 0;
  const c = computeClient({ ...draft, blockLength: length, pushedBack: +draft.pushedBack || 0 }, settings, today);
  const parts: string[] = [];
  if (c.sessionsLeft !== null) parts.push(`${c.sessionsLeft} of ${length} sessions left`);
  if (c.blockEnds) parts.push(`block ends ${fmtShort(c.blockEnds)}`);
  parts.push(`uses ${trimNum(c.load)} of a slot`);
  return `This client: ${parts.join(' · ')}.`;
}

export function isUrgent(c: ComputedClient): boolean {
  return URGENT_ACTIONS.includes(c.action);
}

export function isComingUp(c: ComputedClient): boolean {
  return SOFT_ACTIONS.includes(c.action);
}

export function actionTone(action: ActionKey): Tone {
  return ACTION_META[action].tone;
}

/* ---------- buttons a client offers ---------- */

export type ClientCommand = 'invite' | 'mark-decided' | 'chase' | 'release' | 'reactivate' | 'undo-decided';

export interface ClientButtonSpec {
  label: string;
  variant: 'primary' | 'ghost' | 'danger';
  command: ClientCommand;
}

/** Buttons shown next to a client, most important first. */
export function clientButtons(action: ActionKey): ClientButtonSpec[] {
  switch (action) {
    case 'ended':
    case 'decide':
      return [
        { label: 'Invite back', variant: 'primary', command: 'invite' },
        { label: 'Decided', variant: 'ghost', command: 'mark-decided' },
      ];
    case 'chase':
      return [
        { label: 'Send chase', variant: 'primary', command: 'chase' },
        { label: 'Release', variant: 'danger', command: 'release' },
      ];
    case 'awaiting':
    case 'set-reply':
      return [
        { label: 'Send chase', variant: 'ghost', command: 'chase' },
        { label: 'Release', variant: 'danger', command: 'release' },
      ];
    case 'done':
      return [{ label: 'Reactivate', variant: 'ghost', command: 'reactivate' }];
    case 'decided':
      return [{ label: 'Undo', variant: 'ghost', command: 'undo-decided' }];
    default:
      return [];
  }
}

/* ---------- caseload filters ---------- */

export type FilterKey = 'all' | 'needs' | 'holding' | 'discharged';

export const CASELOAD_FILTERS: { key: FilterKey; label: string; test: (c: ComputedClient) => boolean }[] = [
  { key: 'all', label: 'Active', test: (c) => c.status !== STATUS.DISCHARGED },
  { key: 'needs', label: 'Needs action', test: (c) => isUrgent(c) || isComingUp(c) },
  { key: 'holding', label: 'Holding', test: (c) => c.status === STATUS.HOLDING },
  { key: 'discharged', label: 'Discharged', test: (c) => c.status === STATUS.DISCHARGED },
];

/* ---------- capacity & forecast ---------- */

/** Green under target, amber at, red over. */
export function capacityTone(used: number, target: number): Tone {
  return used < target ? 'green' : used === target ? 'amber' : 'red';
}

/**
 * Cautious slots in use on a date: everyone keeps their slot unless their
 * block has ended AND they're marked likely to finish.
 */
export function slotsUsedAt(computed: ComputedClient[], ref: Date): number {
  return computed.reduce((sum, c) => {
    let occupied = 0;
    if (c.status === STATUS.ACTIVE) {
      const leaving = !!c.blockEnds && c.blockEnds < ref && c.rebook === REBOOK.FINISH;
      occupied = leaving ? 0 : 1;
    } else if (c.status === STATUS.HOLDING) {
      occupied = 1;
    }
    return sum + c.load * occupied;
  }, 0);
}

/**
 * Best-case slots in use: after a block ends only "likely to continue" clients
 * stay. Holding clients count as released (intended: this is the upside).
 */
export function slotsBestCaseAt(computed: ComputedClient[], ref: Date): number {
  return computed.reduce((sum, c) => {
    if (c.status !== STATUS.ACTIVE) return sum;
    const ended = !!c.blockEnds && c.blockEnds < ref;
    const occupied = ended ? (c.rebook === REBOOK.CONTINUE ? 1 : 0) : 1;
    return sum + c.load * occupied;
  }, 0);
}

/** Mondays of the next `weeks` weeks, starting this week. */
export function weekStartsFrom(today: Date, weeks: number): Date[] {
  const first = mondayOf(today);
  return Array.from({ length: weeks }, (_, w) => addDays(first, w * 7));
}

export interface Availability { freq: string; text: string; tone: Tone }

/** For each frequency: the first week a new client could safely start. */
export function availabilityByFrequency(computed: ComputedClient[], frequencies: Frequency[], weekStarts: Date[], target: number): Availability[] {
  const safeFree = weekStarts.map((ws) => Math.max(0, target - slotsUsedAt(computed, ws)));
  return frequencies.map((f) => {
    const need = +f.load || 0;
    const idx = safeFree.findIndex((free) => free >= need);
    if (idx < 0) return { freq: f.name, text: 'Full in this window', tone: 'red' };
    if (idx === 0) return { freq: f.name, text: 'Now', tone: 'green' };
    return { freq: f.name, text: `From ${fmtShort(weekStarts[idx])}`, tone: 'amber' };
  });
}

export interface ForecastWeek {
  weekStart: Date;
  used: number;
  safe: number;
  best: number;
  tone: Tone;
  ending: string[];
  chasing: string[];
}

export function forecastWeek(computed: ComputedClient[], weekStart: Date, target: number): ForecastWeek {
  const used = slotsUsedAt(computed, weekStart);
  const weekEnd = addDays(weekStart, 7);
  const inWeek = (d: Date | null) => !!d && d >= weekStart && d < weekEnd;
  return {
    weekStart,
    used,
    safe: Math.max(0, target - used),
    best: Math.max(0, target - slotsBestCaseAt(computed, weekStart)),
    tone: capacityTone(used, target),
    ending: computed.filter((c) => c.status === STATUS.ACTIVE && inWeek(c.blockEnds)).map((c) => c.name),
    chasing: computed.filter((c) => c.status === STATUS.HOLDING && inWeek(parseIso(c.replyBy))).map((c) => c.name),
  };
}

/** "Ends: A, B · Chase: C" or "—" */
export function forecastDecisions(w: ForecastWeek): string {
  const parts: string[] = [];
  if (w.ending.length) parts.push(`Ends: ${w.ending.join(', ')}`);
  if (w.chasing.length) parts.push(`Chase: ${w.chasing.join(', ')}`);
  return parts.join(' · ') || '—';
}

/** Slot count that fills a forecast bar. Shared by every row so bars compare fairly. */
export function forecastScale(weeks: ForecastWeek[], target: number): number {
  const peak = weeks.reduce((m, w) => Math.max(m, w.used), 0);
  return Math.max(target, peak, 1) * 1.1;
}

export function isStaleDischarge(c: ComputedClient, cutoff: Date): boolean {
  if (c.status !== STATUS.DISCHARGED) return false;
  return !c.blockEnds || c.blockEnds < cutoff;
}

/** How many live clients and waitlist entries use a frequency name. */
export function frequencyUsage(clients: Client[], waitlist: WaitlistEntry[], name: string): number {
  const live = clients.filter((c) => !c.archived && c.status !== STATUS.DISCHARGED && c.frequency === name).length;
  return live + waitlist.filter((w) => w.need === name).length;
}

/* ---------- waitlist ---------- */

/** Days since last contact, or null if never contacted. */
export function daysSinceContact(w: WaitlistEntry, today: Date): number | null {
  const last = parseIso(w.lastContacted);
  return last ? diffDays(today, last) : null;
}

export function waitlistTone(days: number | null): Tone {
  if (days === null) return 'grey';
  if (days >= WAITLIST_OVERDUE_DAYS) return 'red';
  if (days >= WAITLIST_DUE_DAYS) return 'amber';
  return 'green';
}

/** Overdue families get a warm check-in; recent ones get the "space available" offer. */
export function waitlistMessageRole(days: number | null): Role {
  return days !== null && days >= WAITLIST_DUE_DAYS ? ROLE.WAIT_WARM : ROLE.WAIT_OFFER;
}

export interface WaitDue { entry: WaitlistEntry; days: number | null }

/** Families due a warm check-in. Never-contacted counts as due. */
export function waitlistDue(waitlist: WaitlistEntry[], today: Date): WaitDue[] {
  return waitlist
    .map((entry) => ({ entry, days: daysSinceContact(entry, today) }))
    .filter((x) => x.days === null || x.days >= WAITLIST_DUE_DAYS);
}

export function waitDueText(days: number | null): string {
  return days === null ? 'Never contacted' : `${days} days since contact`;
}
