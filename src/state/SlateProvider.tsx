/**
 * Holds the app state and makes it available to every component via useSlate().
 *
 *   state    — saved data + what's on screen (AppState)
 *   derived  — figures worked out from the data (DerivedView)
 *   act      — commands buttons call (commands.ts)
 *   autosave — status of the linked backup file
 *
 * Saving: whenever saved data changes, it's written to localStorage and the
 * auto-save file. Another tab's changes arrive via the 'storage' event.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { STORAGE_KEY } from '../domain/constants';
import { todayNoon, toIso } from '../domain/dates';
import { createAutoSave, initialAutoSaveStatus, type AutoSaveStatus } from '../services/autosave';
import { backupObject } from '../services/backup';
import { loadPersistedState, pickPersisted, requestPersistentStorage, writeSavedState } from '../services/storage';
import { initialAppState, type AppState, type Patch } from './appState';
import { createCommands, type Commands } from './commands';
import { deriveView, type DerivedView } from './derive';

interface SlateContextValue {
  state: AppState;
  derived: DerivedView;
  act: Commands;
  autosave: AutoSaveStatus;
  autosaveControls: ReturnType<typeof createAutoSave>;
  today: Date;
}

const SlateContext = createContext<SlateContextValue | null>(null);

export function SlateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => initialAppState(loadPersistedState()));
  const [autosave, setAutosave] = useState<AutoSaveStatus>(initialAutoSaveStatus);

  // Latest state for commands that check before they update.
  const stateRef = useRef(state);
  stateRef.current = state;

  const autosaveControls = useMemo(
    () => createAutoSave(() => JSON.stringify(backupObject(loadPersistedState()), null, 2), setAutosave),
    [],
  );

  const act = useMemo(
    () => createCommands({
      update: (fn: (s: AppState) => Patch) => setState((prev) => ({ ...prev, ...fn(prev) })),
      get: () => stateRef.current,
      autosave: autosaveControls,
    }),
    [autosaveControls],
  );

  /* ---------- persistence ---------- */

  const persisted = useMemo(
    () => pickPersisted(state),
    // Only the listed parts of state affect this value.
    [state.clients, state.waitlist, state.templates, state.pin, state.seeded, state.settings, state.onboarded],
  );
  const isFirstRun = useRef(true);
  const fromOtherTab = useRef(false);

  useEffect(() => {
    if (isFirstRun.current) { isFirstRun.current = false; return; } // just loaded; nothing new to save
    if (fromOtherTab.current) { fromOtherTab.current = false; return; } // already saved by the other tab
    if (writeSavedState(persisted)) requestPersistentStorage();
    autosaveControls.schedule();
  }, [persisted, autosaveControls]);

  useEffect(() => {
    void autosaveControls.restore();
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      fromOtherTab.current = true;
      setState((prev) => ({ ...prev, ...loadPersistedState() }));
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      autosaveControls.cancel();
    };
  }, [autosaveControls]);

  /* ---------- derived figures ---------- */

  const today = todayNoon();
  const todayKey = toIso(today);
  const derived = useMemo(
    () => deriveView(state, today),
    // Only the listed parts of state affect this value.
    [state.clients, state.waitlist, state.settings, todayKey],
  );

  const value = useMemo(
    () => ({ state, derived, act, autosave, autosaveControls, today }),
    // Only the listed parts of state affect this value.
    [state, derived, act, autosave, autosaveControls, todayKey],
  );

  return <SlateContext.Provider value={value}>{children}</SlateContext.Provider>;
}

export function useSlate(): SlateContextValue {
  const ctx = useContext(SlateContext);
  if (!ctx) throw new Error('useSlate must be used inside <SlateProvider>');
  return ctx;
}
