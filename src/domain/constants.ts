/** App-wide fixed values. Change behaviour here rather than in the code that uses it. */
import type { ActionKey, Frequency, Role, Settings, Tone, ViewKey } from './types';

export const APP_NAME = 'Slate';

/** localStorage key for saved data. Never rename: existing users' data lives here. */
export const STORAGE_KEY = 'cmt_v1';
/** Device-only layout preferences. Never part of a backup. */
export const UI_PREFS_KEY = 'slate_ui';

/** Discharged clients older than this are offered for archiving. */
export const RETENTION_DAYS = 180;
/** Waitlist families not contacted for this long are due a check-in… */
export const WAITLIST_DUE_DAYS = 14;
/** …and are overdue after this long. */
export const WAITLIST_OVERDUE_DAYS = 21;
export const MIN_PIN_LENGTH = 4;
export const REVIEW_STEP_COUNT = 4;
export const MAX_FORECAST_WEEKS = 26;

/** Screen widths (px) where the layout changes. */
export const PHONE_MAX = 700;
export const FULL_SIDEBAR_MIN = 1100;

export const DEFAULT_FREQUENCIES: Frequency[] = [
  { name: 'Weekly', load: 1, gap: 1 },
  { name: 'Fortnightly', load: 0.5, gap: 2 },
  { name: 'Every 3 weeks', load: 0.33, gap: 3 },
  { name: 'Monthly', load: 0.25, gap: 4 },
  { name: 'Every 6 weeks', load: 0.17, gap: 6 },
  { name: 'One-off', load: 1, gap: 1 },
];

export const DEFAULT_SETTINGS: Settings = { yourName: '', target: 8, weeks: 12, lead: 2, frequencies: DEFAULT_FREQUENCIES };

export const STATUS = { ACTIVE: 'Active', HOLDING: 'Holding', DISCHARGED: 'Discharged' } as const;

/** Rebook intentions. These two values drive the forecast. */
export const REBOOK = { CONTINUE: 'Likely to continue', FINISH: 'Likely to finish' } as const;

/** Label and status colour for each action a client can need. */
export const ACTION_META: Record<ActionKey, { label: string; tone: Tone }> = {
  'ended': { label: 'Block ended', tone: 'red' },
  'decide': { label: 'Decide now', tone: 'red' },
  'chase': { label: 'Chase or release', tone: 'red' },
  'review': { label: 'Review soon', tone: 'amber' },
  'awaiting': { label: 'Awaiting reply', tone: 'amber' },
  'set-reply': { label: 'Set reply-by', tone: 'amber' },
  'fill': { label: 'Add block details', tone: 'grey' },
  'ok': { label: 'On track', tone: 'green' },
  'decided': { label: 'Decided', tone: 'grey' },
  'done': { label: 'Discharged', tone: 'grey' },
};

/** "Act now" on This week. */
export const URGENT_ACTIONS: ActionKey[] = ['ended', 'decide', 'chase'];
/** "Coming up" on This week. */
export const SOFT_ACTIONS: ActionKey[] = ['awaiting', 'set-reply', 'review'];

/** Template roles: which template powers which one-click action. */
export const ROLE = {
  INVITE: 'invite', CHASE: 'chase', RELEASE: 'release',
  WAIT_WARM: 'waitlist-warm', WAIT_OFFER: 'waitlist-offer', CUSTOM: 'custom',
} as const;

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: ROLE.CUSTOM, label: 'Your template (no action)' },
  { value: ROLE.INVITE, label: 'Powers · Invite back' },
  { value: ROLE.CHASE, label: 'Powers · Send chase' },
  { value: ROLE.RELEASE, label: 'Powers · Release slot' },
  { value: ROLE.WAIT_WARM, label: 'Powers · Waitlist check-in' },
  { value: ROLE.WAIT_OFFER, label: 'Powers · Waitlist offer' },
];

export interface NavItem { key: ViewKey; label: string; short: string }

/** Main screens, in sidebar order. `short` is used on the slim rail and phone tabs. */
export const NAV: NavItem[] = [
  { key: 'week', label: 'This week', short: 'Week' },
  { key: 'caseload', label: 'Caseload', short: 'Clients' },
  { key: 'forecast', label: 'Forecast', short: 'Forecast' },
  { key: 'waitlist', label: 'Waitlist', short: 'Waitlist' },
  { key: 'messages', label: 'Messages', short: 'Messages' },
  { key: 'settings', label: 'Settings', short: 'Settings' },
  { key: 'backup', label: 'Backup', short: 'Backup' },
];

/** Phone bottom bar; the rest live under "More". */
export const PHONE_TABS: ViewKey[] = ['week', 'caseload', 'forecast', 'waitlist'];
export const PHONE_MORE: ViewKey[] = ['messages', 'settings', 'backup'];
