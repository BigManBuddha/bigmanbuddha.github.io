/**
 * Auto-save to a file the user picks (File System Access API, Chrome/Edge on desktop).
 * The file handle is remembered in IndexedDB so auto-save resumes next session;
 * the browser may ask for permission again, which shows as "Reconnect".
 */

const IDB_NAME = 'cmt_fs';
const IDB_STORE = 'kv';
const IDB_HANDLE_KEY = 'saveHandle';
const WRITE_DEBOUNCE_MS = 400;
const RECONNECT_TEXT = 'Reconnect needed. Click Reconnect to resume auto-save.';

/* The parts of the File System Access API we use (not yet in TypeScript's DOM types). */
type Permission = 'granted' | 'denied' | 'prompt';
interface Writable { write(data: string): Promise<void>; close(): Promise<void> }
interface SaveHandle {
  name: string;
  queryPermission(options: { mode: 'readwrite' }): Promise<Permission>;
  requestPermission(options: { mode: 'readwrite' }): Promise<Permission>;
  createWritable(): Promise<Writable>;
}
type SavePicker = (options: {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<SaveHandle>;

function savePicker(): SavePicker | null {
  return (globalThis as unknown as { showSaveFilePicker?: SavePicker }).showSaveFilePicker ?? null;
}

export function autoSaveSupported(): boolean {
  return !!savePicker();
}

/* ---------- tiny IndexedDB key/value store ---------- */

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idb<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(IDB_STORE, mode).objectStore(IDB_STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

/* ---------- controller ---------- */

export interface AutoSaveStatus {
  supported: boolean;
  linked: boolean;
  fileName: string;
  message: string;
  error: string;
  needsReconnect: boolean;
}

export interface AutoSaveControls {
  restore(): Promise<void>;
  connect(): Promise<void>;
  reconnect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Forget the file without writing to it (used before deleting all data). */
  unlink(): void;
  /** Queue a write of the latest data. No-op when no file is linked. */
  schedule(): void;
  cancel(): void;
}

export function initialAutoSaveStatus(): AutoSaveStatus {
  return { supported: autoSaveSupported(), linked: false, fileName: '', message: '', error: '', needsReconnect: false };
}

function savedAtText(fileName: string): string {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `Saved to ${fileName} · ${time}`;
}

/**
 * @param getContents returns the file contents to write (called at write time, so always current)
 * @param onStatus    called whenever the status changes
 */
export function createAutoSave(getContents: () => string, onStatus: (s: AutoSaveStatus) => void): AutoSaveControls {
  let handle: SaveHandle | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let writing = false;
  let writePending = false;
  let status = initialAutoSaveStatus();

  const emit = (patch: Partial<AutoSaveStatus>) => {
    status = { ...status, ...patch };
    onStatus(status);
  };

  const linkedTo = (h: SaveHandle, granted: boolean) => emit({
    linked: true, fileName: h.name, error: '', needsReconnect: !granted,
    message: granted ? `Auto-saving to ${h.name}` : RECONNECT_TEXT,
  });

  // Single-flight: if a write is running, queue exactly one more.
  async function write(): Promise<void> {
    const h = handle;
    if (!h) return;
    if (writing) { writePending = true; return; }
    writing = true;
    try {
      if ((await h.queryPermission({ mode: 'readwrite' })) !== 'granted') { linkedTo(h, false); return; }
      const writable = await h.createWritable();
      await writable.write(getContents());
      await writable.close();
      emit({ message: savedAtText(h.name), error: '', needsReconnect: false });
    } catch {
      emit({ error: 'Auto-save failed. The file may have moved or be open elsewhere. Reconnect it.' });
    } finally {
      writing = false;
      if (writePending) { writePending = false; void write(); }
    }
  }

  return {
    async restore() {
      if (!status.supported) return;
      try {
        const saved = await idb<SaveHandle | undefined>('readonly', (s) => s.get(IDB_HANDLE_KEY));
        if (!saved) return;
        handle = saved;
        linkedTo(saved, (await saved.queryPermission({ mode: 'readwrite' })) === 'granted');
      } catch { /* nothing saved, or IndexedDB unavailable */ }
    },

    async connect() {
      const pick = savePicker();
      if (!pick) return;
      try {
        const h = await pick({
          suggestedName: 'caseload.json',
          types: [{ description: 'Slate backup', accept: { 'application/json': ['.json'] } }],
        });
        handle = h;
        await idb('readwrite', (s) => s.put(h, IDB_HANDLE_KEY));
        linkedTo(h, true);
        await write();
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') emit({ error: 'Could not link a file.' });
      }
    },

    async reconnect() {
      if (!handle) return this.connect();
      try {
        if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') { emit({ error: 'Permission was declined.' }); return; }
        linkedTo(handle, true);
        await write();
      } catch {
        emit({ error: 'Could not reconnect.' });
      }
    },

    async disconnect() {
      this.unlink();
    },

    unlink() {
      clearTimeout(timer);
      handle = null;
      emit({ linked: false, fileName: '', message: '', error: '', needsReconnect: false });
      idb('readwrite', (s) => s.delete(IDB_HANDLE_KEY)).catch(() => undefined);
    },

    schedule() {
      if (!handle) return;
      clearTimeout(timer);
      timer = setTimeout(() => void write(), WRITE_DEBOUNCE_MS);
    },

    cancel() {
      clearTimeout(timer);
    },
  };
}
