/**
 * Shapes of the data Slate stores. Saved data (localStorage) and backup files
 * use exactly these shapes, so changing a field name is a breaking change.
 */

export type Status = 'Active' | 'Holding' | 'Discharged';
export type Role = 'invite' | 'chase' | 'release' | 'waitlist-warm' | 'waitlist-offer' | 'custom';
export type Tone = 'red' | 'amber' | 'green' | 'grey';
export type ViewKey = 'week' | 'caseload' | 'forecast' | 'waitlist' | 'messages' | 'settings' | 'backup';

/** Every client resolves to exactly one of these each day (see clientAction). */
export type ActionKey =
  | 'ended' | 'decide' | 'chase' | 'review' | 'awaiting'
  | 'set-reply' | 'fill' | 'ok' | 'decided' | 'done';

/** Numbers typed into forms arrive as strings; read them through settings.ts helpers. */
export type NumberInput = number | string;

export interface Client {
  id: string;
  name: string;
  contact: string;
  /** Name of a Frequency in settings. */
  frequency: string;
  /** ISO date 'YYYY-MM-DD'. */
  blockStart: string;
  /** Sessions in the current block. */
  blockLength: number;
  /** Weeks the block has slipped (holidays, cancellations). */
  pushedBack: number;
  status: Status;
  /** ISO date; used while Holding. */
  replyBy: string;
  /** '' | 'Likely to continue' | 'Likely to finish' */
  rebook: string;
  decided: boolean;
  notes: string;
  archived?: boolean;
}

/** A client while being edited in the form. */
export type ClientDraft = Omit<Client, 'blockLength' | 'pushedBack'> & {
  blockLength: NumberInput;
  pushedBack: NumberInput;
};

export interface WaitlistEntry {
  id: string;
  name: string;
  /** Frequency name they need. */
  need: string;
  added: string;
  lastContacted: string;
  notes: string;
}

export interface Template {
  id: string;
  role: Role;
  title: string;
  body: string;
}

export interface Frequency {
  name: string;
  /** Share of one weekly slot a client uses (weekly = 1, fortnightly = 0.5). */
  load: NumberInput;
  /** Weeks between sessions. */
  gap: NumberInput;
}

export interface Settings {
  yourName: string;
  target: NumberInput;
  weeks: NumberInput;
  lead: NumberInput;
  frequencies: Frequency[];
}

/** Everything saved to the device and included in backups. */
export interface PersistedState {
  clients: Client[];
  waitlist: WaitlistEntry[];
  templates: Template[];
  /** Salted SHA-256 hash of the PIN, or null when no PIN is set. */
  pin: string | null;
  seeded: boolean;
  settings: Settings;
  onboarded: boolean;
}

/** A client plus everything worked out from it for today. */
export interface ComputedClient extends Client {
  load: number;
  gap: number;
  action: ActionKey;
  sessionsLeft: number | null;
  blockEnds: Date | null;
  len: number;
}
