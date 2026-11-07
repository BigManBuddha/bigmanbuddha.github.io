/**
 * Every change the app can make, as pure functions: (current state, inputs) → patch.
 * No browser calls, no dates read from the clock, no dialogs, which keeps them
 * easy to test. Side effects (confirm boxes, clipboard, files) live in commands.ts.
 */
import { RETENTION_DAYS, REVIEW_STEP_COUNT, ROLE, STATUS } from '../domain/constants';
import { computeClient, frequencyUsage, isStaleDischarge } from '../domain/caseload';
import { addDays, mondayOf, toIso } from '../domain/dates';
import { newId } from '../domain/format';
import { sampleCaseload } from '../domain/sample';
import { defaultSettings, leadWeeks } from '../domain/settings';
import { assignTemplateRole, defaultTemplates, fillTemplate, stripNumbering, templateForRole, type Recipient } from '../domain/templates';
import type { Client, ClientDraft, Frequency, PersistedState, Role, Settings, Status, Template, ViewKey, WaitlistEntry } from '../domain/types';
import type { AppState, Patch, PendingChange } from './appState';

/* ---------- navigation ---------- */

export function go(view: ViewKey): Patch {
  return { view };
}

export function closePanel(): Patch {
  return { panel: null };
}

/* ---------- clients ---------- */

export function updateClient(s: AppState, id: string, patch: Partial<Client>): Patch {
  return { clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
}

export function newClientDraft(today: Date): ClientDraft {
  return {
    id: '', name: '', contact: '', frequency: 'Weekly',
    blockStart: toIso(mondayOf(today)), blockLength: 6, pushedBack: 0,
    status: STATUS.ACTIVE, replyBy: '', rebook: '', decided: false, notes: '',
  };
}

/** Save the client form. A blank name just closes the panel. */
export function saveClient(s: AppState, d: ClientDraft): Patch {
  if (!d.name.trim()) return closePanel();
  const clean: Client = {
    id: d.id || newId('c'),
    name: d.name.trim(),
    contact: d.contact || '',
    frequency: d.frequency,
    blockStart: d.blockStart,
    blockLength: Math.max(0, Math.round(+d.blockLength || 0)),
    pushedBack: +d.pushedBack || 0,
    status: d.status as Status,
    replyBy: d.replyBy || '',
    rebook: d.rebook || '',
    decided: !!d.decided,
    notes: d.notes || '',
  };
  const exists = s.clients.some((c) => c.id === clean.id);
  const clients = exists ? s.clients.map((c) => (c.id === clean.id ? clean : c)) : [...s.clients, clean];
  return { clients, panel: null };
}

export function deleteClient(s: AppState, id: string): Patch {
  return { clients: s.clients.filter((c) => c.id !== id), panel: null };
}

/* ---------- waitlist ---------- */

export function newWaitDraft(today: Date): WaitlistEntry {
  const iso = toIso(today);
  return { id: '', name: '', need: 'Weekly', added: iso, lastContacted: iso, notes: '' };
}

export function saveWait(s: AppState, d: WaitlistEntry): Patch {
  if (!d.name.trim()) return closePanel();
  const clean: WaitlistEntry = { ...d, id: d.id || newId('w'), name: d.name.trim(), notes: d.notes || '' };
  const exists = s.waitlist.some((w) => w.id === clean.id);
  const waitlist = exists ? s.waitlist.map((w) => (w.id === clean.id ? clean : w)) : [...s.waitlist, clean];
  return { waitlist, panel: null };
}

export function deleteWait(s: AppState, id: string): Patch {
  return { waitlist: s.waitlist.filter((w) => w.id !== id), panel: null };
}

/* ---------- messages ---------- */

/** Open the message panel with a filled template. `pending` is applied only on confirm. */
export function composeMessage(s: AppState, recipient: Recipient, role: Role, pending: PendingChange | null = null): Patch {
  const t = templateForRole(s.templates, role);
  return {
    panel: {
      kind: 'message',
      message: {
        id: newId('m'),
        title: stripNumbering(t.title),
        subtitle: recipient.name ? `For ${recipient.name}` : '',
        body: fillTemplate(t.body, recipient, s.settings.yourName),
        pending,
        copied: false,
      },
    },
  };
}

/** Invite a client back: holds their slot with a reply-by date once confirmed. */
export function inviteBack(s: AppState, c: Client, today: Date): Patch {
  const weeks = Math.max(1, leadWeeks(s.settings)); // never a reply-by of today
  const replyBy = toIso(addDays(today, weeks * 7));
  return composeMessage(s, { ...c, replyBy }, ROLE.INVITE, {
    clientId: c.id, clientName: c.name,
    patch: { status: STATUS.HOLDING, replyBy, decided: true },
    confirmLabel: 'Confirm — hold slot',
  });
}

export function release(s: AppState, c: Client): Patch {
  return composeMessage(s, c, ROLE.RELEASE, {
    clientId: c.id, clientName: c.name,
    patch: { status: STATUS.DISCHARGED },
    confirmLabel: 'Confirm — release slot',
  });
}

export function sendChase(s: AppState, c: Client): Patch {
  return composeMessage(s, c, ROLE.CHASE);
}

export function messageWaitlist(s: AppState, w: WaitlistEntry, role: Role): Patch {
  return composeMessage(s, { name: w.name }, role);
}

/** Apply the pending change from the open message panel. */
export function confirmPending(s: AppState): Patch {
  const pending = s.panel?.kind === 'message' ? s.panel.message.pending : null;
  if (!pending) return closePanel();
  return { ...updateClient(s, pending.clientId, pending.patch), panel: null };
}

/** Show a template (placeholders left in brackets) after copying it. */
export function showCopiedTemplate(s: AppState, t: Template): Patch {
  return {
    panel: {
      kind: 'message',
      message: {
        id: newId('m'),
        title: stripNumbering(t.title),
        subtitle: 'Fill the [brackets] before sending',
        body: fillTemplate(t.body, null, s.settings.yourName),
        pending: null,
        copied: true,
      },
    },
  };
}

/* ---------- templates ---------- */

export function editTemplate(s: AppState, id: string, field: 'title' | 'body', value: string): Patch {
  return { templates: s.templates.map((t) => (t.id === id ? { ...t, [field]: value } : t)) };
}

export function addTemplate(s: AppState): Patch {
  return { templates: [...s.templates, { id: newId('t'), role: ROLE.CUSTOM, title: 'New template', body: '' }] };
}

export function setTemplateRole(s: AppState, id: string, role: Role): Patch {
  return { templates: assignTemplateRole(s.templates, id, role) };
}

export function deleteTemplate(s: AppState, id: string): Patch {
  return { templates: s.templates.filter((t) => t.id !== id) };
}

/* ---------- settings ---------- */

export function updateSettings(s: AppState, patch: Partial<Settings>): Patch {
  return { settings: { ...s.settings, ...patch } };
}

/** Renaming a frequency also renames it on every client and waitlist entry using it. */
export function editFrequency(s: AppState, index: number, field: keyof Frequency, value: string): Patch {
  const old = s.settings.frequencies[index];
  const frequencies = s.settings.frequencies.map((f, i) => (i === index ? { ...f, [field]: value } : f));
  const patch: Patch = { settings: { ...s.settings, frequencies } };
  if (field === 'name' && old && old.name !== value) {
    patch.clients = s.clients.map((c) => (c.frequency === old.name ? { ...c, frequency: value } : c));
    patch.waitlist = s.waitlist.map((w) => (w.need === old.name ? { ...w, need: value } : w));
  }
  return patch;
}

export function addFrequency(s: AppState): Patch {
  return updateSettings(s, { frequencies: [...s.settings.frequencies, { name: 'New', load: 1, gap: 1 }] });
}

/** Why a frequency can't be removed, or '' if it can. */
export function frequencyRemovalProblem(s: AppState, index: number): string {
  const f = s.settings.frequencies[index];
  if (!f) return 'That frequency no longer exists.';
  const used = frequencyUsage(s.clients, s.waitlist, f.name);
  if (used > 0) return `"${f.name}" is used by ${used} client(s) or waitlist entries. Change them to another frequency first.`;
  if (s.settings.frequencies.length <= 1) return 'Keep at least one frequency.';
  return '';
}

export function removeFrequency(s: AppState, index: number): Patch {
  return updateSettings(s, { frequencies: s.settings.frequencies.filter((_, i) => i !== index) });
}

/* ---------- data ---------- */

export function seedSample(today: Date): Patch {
  return { ...sampleCaseload(today), seeded: true };
}

export function applyBackup(data: Partial<PersistedState>): Patch {
  return { ...data };
}

/** Wipe everything on this device back to a fresh install (keeps onboarding dismissed). */
export function resetAll(): Patch {
  return {
    clients: [], waitlist: [], templates: defaultTemplates(), seeded: false,
    settings: defaultSettings(), pin: null, locked: false,
    panel: null, reviewStep: null, view: 'week', onboardOpen: false, noticeDismissed: false,
  };
}

/** Hide discharged clients whose block ended more than RETENTION_DAYS ago. */
export function archiveOld(s: AppState, today: Date): Patch {
  const cutoff = addDays(today, -RETENTION_DAYS);
  return {
    clients: s.clients.map((c) => (isStaleDischarge(computeClient(c, s.settings, today), cutoff) ? { ...c, archived: true } : c)),
  };
}

/* ---------- lock ---------- */

export function lock(): Patch {
  return { locked: true, panel: null, reviewStep: null };
}

export function unlock(): Patch {
  return { locked: false };
}

/* ---------- onboarding & weekly review ---------- */

export function finishOnboarding(): Patch {
  return { onboarded: true, onboardOpen: false };
}

export function startReview(): Patch {
  return { reviewStep: 0 };
}

export function reviewNext(s: AppState): Patch {
  const step = s.reviewStep ?? 0;
  return { reviewStep: step >= REVIEW_STEP_COUNT - 1 ? null : step + 1 };
}

export function reviewBack(s: AppState): Patch {
  return { reviewStep: Math.max(0, (s.reviewStep ?? 0) - 1) };
}

export function closeReview(): Patch {
  return { reviewStep: null };
}
