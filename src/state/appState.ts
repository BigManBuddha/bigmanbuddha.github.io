/** The shape of the whole app's state: saved data plus what's on screen. */
import type { Client, PersistedState, ViewKey, WaitlistEntry } from '../domain/types';

/** A change to apply to a client only once the user confirms (e.g. "hold slot"). */
export interface PendingChange {
  clientId: string;
  clientName: string;
  patch: Partial<Client>;
  confirmLabel: string;
}

export interface MessageDraft {
  /** Unique per opening, so the panel resets when a new message opens. */
  id: string;
  title: string;
  subtitle: string;
  body: string;
  pending: PendingChange | null;
  copied: boolean;
}

/** The right-hand panel currently open, if any. */
export type PanelState =
  | { kind: 'client'; client: Client | null }
  | { kind: 'waitlist'; entry: WaitlistEntry | null }
  | { kind: 'message'; message: MessageDraft }
  | { kind: 'delete-all' };

export interface AppState extends PersistedState {
  view: ViewKey;
  locked: boolean;
  panel: PanelState | null;
  /** Weekly review step (0-based), or null when closed. */
  reviewStep: number | null;
  onboardOpen: boolean;
  noticeDismissed: boolean;
}

export type Patch = Partial<AppState>;

export function initialAppState(persisted: PersistedState): AppState {
  return {
    ...persisted,
    view: 'week',
    locked: !!persisted.pin,
    panel: null,
    reviewStep: null,
    onboardOpen: !persisted.onboarded,
    noticeDismissed: false,
  };
}
