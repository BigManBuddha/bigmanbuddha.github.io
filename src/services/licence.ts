/**
 * Licence keys. One key unlocks Slate on one device.
 *
 * Activation (once, needs internet): the app sends the key and a random device ID
 * to the licence server, which replies with a signature. The app stores that and,
 * from then on, checks it offline against the public key below. Slate never needs
 * to contact the server again on that device.
 *
 * Without a licence Slate runs as a trial: everything works on the sample
 * caseload, but you can't add your own clients or waitlist, or import a backup.
 *
 * Any check that runs on the user's own device can be bypassed by someone
 * technical and determined. This stops casual key sharing; it isn't DRM.
 */

/** Public settings baked in at build time from .env (none are secret). */
const LICENCE_API = (import.meta.env.VITE_LICENCE_API ?? '').replace(/\/$/, '');
const PUBLIC_KEY = import.meta.env.VITE_LICENCE_PUBLIC_KEY ?? '';
export const BUY_URL = import.meta.env.VITE_BUY_URL ?? '';

/** Device-only storage keys. Never part of a backup, and not wiped by "Delete everything". */
const ACTIVATION_KEY = 'slate_licence';
const DEVICE_KEY = 'slate_device';
const SIGNED_PREFIX = 'slate-licence-v1';

const OFFLINE = "Couldn't reach the licence server. Check you're online and try again.";

export type LicenceStatus = 'checking' | 'active' | 'trial';

export interface Activation {
  key: string;
  deviceId: string;
  issuedAt: string;
  signature: string;
}

type Outcome<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/* ---------- key format ---------- */

/** "slate abcd efgh…" → "SLATE-ABCD-EFGH-…". Forgives spaces, missing dashes and lower case. */
export function normalizeKey(input: string): string {
  const raw = input.toUpperCase().replace(/[^0-9A-Z]/g, '');
  const body = raw.length === 21 && raw.startsWith('SLATE') ? raw.slice(5) : raw;
  return ['SLATE', ...(body.match(/.{1,4}/g) ?? [])].join('-');
}

export function looksLikeKey(key: string): boolean {
  return /^SLATE(-[2-9A-HJ-NP-Z]{4}){4}$/.test(key);
}

/* ---------- device storage ---------- */

function storage(): Storage | null {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/** A random ID for this browser, created on first use. */
export function getDeviceId(): string {
  const s = storage();
  let id = s?.getItem(DEVICE_KEY) ?? '';
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
    s?.setItem(DEVICE_KEY, id);
  }
  return id;
}

function readActivation(): Activation | null {
  try { return JSON.parse(storage()?.getItem(ACTIVATION_KEY) ?? 'null') as Activation | null; } catch { return null; }
}

function saveActivation(a: Activation): void {
  storage()?.setItem(ACTIVATION_KEY, JSON.stringify(a));
}

/* ---------- signature check (offline) ---------- */

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export function signedMessage(a: Pick<Activation, 'key' | 'deviceId' | 'issuedAt'>): string {
  return `${SIGNED_PREFIX}|${a.key}|${a.deviceId}|${a.issuedAt}`;
}

/** True if the activation was signed by our server for this device. */
export async function verifyActivation(a: Activation | null, deviceId: string, publicKeyJwk: string = PUBLIC_KEY): Promise<boolean> {
  if (!a || !publicKeyJwk || a.deviceId !== deviceId) return false;
  try {
    const key = await crypto.subtle.importKey('jwk', JSON.parse(publicKeyJwk), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const message = new TextEncoder().encode(signedMessage(a));
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, fromBase64Url(a.signature), message);
  } catch {
    return false;
  }
}

/** Startup check. Development builds without a public key count as licensed so you can work on the app. */
export async function checkLicence(): Promise<{ status: 'active' | 'trial'; key: string }> {
  if (import.meta.env.DEV && !PUBLIC_KEY) return { status: 'active', key: '' };
  const a = readActivation();
  return (await verifyActivation(a, getDeviceId())) ? { status: 'active', key: a!.key } : { status: 'trial', key: '' };
}

/* ---------- talking to the licence server ---------- */

async function callServer(path: string, init?: RequestInit): Promise<Outcome<{ data: Record<string, unknown> }>> {
  if (!LICENCE_API) return { ok: false, error: "Licence activation isn't set up in this build yet." };
  let res: Response;
  try { res = await fetch(`${LICENCE_API}${path}`, init); } catch { return { ok: false, error: OFFLINE }; }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) return { ok: false, error: typeof data.error === 'string' ? data.error : 'Something went wrong. Please try again.' };
  return { ok: true, data };
}

/** Activate a key on this device and store the signed result. */
export async function activateKey(key: string): Promise<Outcome> {
  const deviceId = getDeviceId();
  const res = await callServer('/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, deviceId }),
  });
  if (!res.ok) return res;
  const activation = res.data.activation as Activation;
  if (!(await verifyActivation(activation, deviceId))) {
    return { ok: false, error: 'The licence server sent a reply this app could not verify. Please contact support.' };
  }
  saveActivation(activation);
  return { ok: true };
}

/** After Stripe checkout: swap the session ID in the return URL for the buyer's key. */
export async function claimPurchase(sessionId: string): Promise<Outcome<{ key: string }>> {
  const res = await callServer(`/claim?session_id=${encodeURIComponent(sessionId)}`);
  if (!res.ok) return res;
  return { ok: true, key: String(res.data.key) };
}

/** Read and remove ?session_id=… from the address bar (Stripe adds it after payment). */
export function takeCheckoutSessionId(): string | null {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('session_id');
  if (id) {
    params.delete('session_id');
    const query = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
  }
  return id;
}
