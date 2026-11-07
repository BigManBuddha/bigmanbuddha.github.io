/**
 * Commands: what buttons call. Each one applies a pure action from actions.ts
 * and handles any side effect around it (confirm boxes, clipboard, files, PIN hashing).
 */
import { todayNoon, toIso } from '../domain/dates';
import { fillTemplate } from '../domain/templates';
import type { Client, ClientDraft, Frequency, Role, Settings, Template, ViewKey, WaitlistEntry } from '../domain/types';
import type { AutoSaveControls } from '../services/autosave';
import { backupObject, downloadJson, parseBackup } from '../services/backup';
import { confirmBox, copyToClipboard, notify, scrollToTop } from '../services/browser';
import * as licence from '../services/licence';
import { hashPin, pinMatches, pinProblem } from '../services/pin';
import * as A from './actions';
import type { AppState, Patch } from './appState';

export interface CommandDeps {
  /** Apply a patch computed from the latest state. */
  update: (fn: (s: AppState) => Patch) => void;
  /** The latest state (for checks made before updating). */
  get: () => AppState;
  autosave: AutoSaveControls;
}

export function createCommands({ update, get, autosave }: CommandDeps) {
  const deleteAll = () => {
    autosave.unlink(); // unlink first so the wipe is never written to the backup file
    update(() => A.resetAll());
  };

  /** Trial gate: true if licensed, otherwise opens the unlock panel explaining why. */
  const requireLicence = (reason: string): boolean => {
    if (get().licence === 'active') return true;
    update(() => ({ panel: { kind: 'licence', reason } }));
    return false;
  };

  return {
    /* navigation & panels */
    go(view: ViewKey) { update(() => A.go(view)); scrollToTop(); },
    closePanel() { update(A.closePanel); },

    /* clients */
    openClient(client: Client | null) {
      if (!client && !requireLicence('Adding your own clients needs a licence.')) return;
      update(() => ({ panel: { kind: 'client', client } }));
    },
    saveClient(draft: ClientDraft) { update((s) => A.saveClient(s, draft)); },
    deleteClient(id: string) { update((s) => A.deleteClient(s, id)); },
    updateClient(id: string, patch: Partial<Client>) { update((s) => A.updateClient(s, id, patch)); },
    inviteBack(client: Client) { update((s) => A.inviteBack(s, client, todayNoon())); },
    release(client: Client) { update((s) => A.release(s, client)); },
    sendChase(client: Client) { update((s) => A.sendChase(s, client)); },
    confirmPending() { update(A.confirmPending); },

    /* waitlist */
    openWaitlist(entry: WaitlistEntry | null) {
      if (!entry && !requireLicence('Adding people to your waitlist needs a licence.')) return;
      update(() => ({ panel: { kind: 'waitlist', entry } }));
    },
    saveWait(draft: WaitlistEntry) { update((s) => A.saveWait(s, draft)); },
    deleteWait(id: string) { update((s) => A.deleteWait(s, id)); },
    messageWaitlist(entry: WaitlistEntry, role: Role) { update((s) => A.messageWaitlist(s, entry, role)); },

    /* messages & templates */
    copyText(text: string) { return copyToClipboard(text); },
    copyTemplate(t: Template) {
      void copyToClipboard(fillTemplate(t.body, null, get().settings.yourName));
      update((s) => A.showCopiedTemplate(s, t));
    },
    editTemplate(id: string, field: 'title' | 'body', value: string) { update((s) => A.editTemplate(s, id, field, value)); },
    addTemplate() { update(A.addTemplate); },
    setTemplateRole(id: string, role: Role) { update((s) => A.setTemplateRole(s, id, role)); },
    deleteTemplate(id: string) {
      if (confirmBox('Delete this template?')) update((s) => A.deleteTemplate(s, id));
    },

    /* settings */
    updateSettings(patch: Partial<Settings>) { update((s) => A.updateSettings(s, patch)); },
    editFrequency(index: number, field: keyof Frequency, value: string) { update((s) => A.editFrequency(s, index, field, value)); },
    addFrequency() { update(A.addFrequency); },
    removeFrequency(index: number) {
      const problem = A.frequencyRemovalProblem(get(), index);
      if (problem) { notify(problem); return; }
      update((s) => A.removeFrequency(s, index));
    },

    /* data */
    seedSample() { update(() => A.seedSample(todayNoon())); },
    exportBackup() { downloadJson(backupObject(get()), `caseload-backup-${toIso(todayNoon())}.json`); },
    /** Returns true if the backup was applied. */
    importBackup(text: string): boolean {
      if (!requireLicence('Importing a backup needs a licence.')) return false;
      const s = get();
      let data;
      try { data = parseBackup(text, s.settings); } catch { notify('That file could not be read as a Slate backup.'); return false; }
      const hasData = s.clients.length > 0 || s.waitlist.length > 0;
      const count = data.clients?.length ?? 0;
      if (hasData && !confirmBox(`Replace everything on this device with this backup (${count} clients)? Your current data will be overwritten.`)) return false;
      update(() => A.applyBackup(data));
      return true;
    },
    archiveOld() { update((s) => A.archiveOld(s, todayNoon())); },
    openDeleteAll() { update(() => ({ panel: { kind: 'delete-all' } })); },
    deleteAll,
    dismissNotice() { update(() => ({ noticeDismissed: true })); },

    /* PIN lock */
    /** Returns a problem to show, or '' once saved. */
    async setPin(pin: string): Promise<string> {
      const problem = pinProblem(pin.trim());
      if (problem) return problem;
      const hashed = await hashPin(pin.trim());
      update(() => ({ pin: hashed }));
      return '';
    },
    removePin() {
      if (confirmBox('Remove the PIN lock?')) update(() => ({ pin: null }));
    },
    lock() { if (get().pin) update(A.lock); },
    async unlock(entry: string): Promise<boolean> {
      const ok = await pinMatches(entry, get().pin);
      if (ok) update(A.unlock);
      return ok;
    },
    forgotPin() {
      const ok = confirmBox("Without the PIN, the only way back in is to erase Slate's data on this device. "
        + 'If you have a backup or auto-save file, you can import it afterwards.\n\nErase and start again?');
      if (ok) deleteAll();
    },

    /* licence */
    openLicence() { update(() => ({ panel: { kind: 'licence' } })); },
    /** Returns a problem to show, or '' once unlocked. */
    async activateLicence(input: string): Promise<string> {
      const key = licence.normalizeKey(input);
      if (!licence.looksLikeKey(key)) return "That doesn't look like a Slate key. It should look like SLATE-XXXX-XXXX-XXXX-XXXX.";
      const result = await licence.activateKey(key);
      if (!result.ok) return result.error;
      update(() => ({ licence: 'active', licenceKey: key }));
      return '';
    },
    /** Back from Stripe checkout: fetch the new key, activate it, and show it. */
    async claimPurchase(sessionId: string) {
      update(() => ({ panel: { kind: 'licence', claiming: true }, onboardOpen: false }));
      const claimed = await licence.claimPurchase(sessionId);
      if (!claimed.ok) { update(() => ({ panel: { kind: 'licence', error: claimed.error } })); return; }
      const result = await licence.activateKey(claimed.key);
      update(() => (result.ok
        ? { licence: 'active', licenceKey: claimed.key, onboarded: true, panel: { kind: 'licence', purchasedKey: claimed.key } }
        : { panel: { kind: 'licence', purchasedKey: claimed.key, error: result.error } }));
    },

    /* onboarding & weekly review */
    finishOnboarding() { update(A.finishOnboarding); },
    startReview() { update(A.startReview); },
    reviewNext() { update(A.reviewNext); },
    reviewBack() { update(A.reviewBack); },
    closeReview() { update(A.closeReview); },
  };
}

export type Commands = ReturnType<typeof createCommands>;
