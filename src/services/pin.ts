/**
 * PIN lock. The PIN is stored as a salted SHA-256 hash, never as typed.
 * This is a privacy screen, not encryption: the caseload itself is still
 * readable in browser storage by someone with access to the device.
 */
import { MIN_PIN_LENGTH } from '../domain/constants';

const PIN_SALT = 'slate-pin:';
const HASH_PREFIX = 'sha256:';

/** Why a PIN can't be used, or '' if it's fine. */
export function pinProblem(pin: string): string {
  if (!/^\d*$/.test(pin)) return 'Use digits only.';
  if (pin.length < MIN_PIN_LENGTH) return `Use at least ${MIN_PIN_LENGTH} digits.`;
  return '';
}

export async function hashPin(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(PIN_SALT + pin);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  return HASH_PREFIX + hex;
}

export async function pinMatches(entry: string, stored: string | null): Promise<boolean> {
  if (!stored) return true;
  if (!stored.startsWith(HASH_PREFIX)) return entry === stored; // PINs saved before hashing
  return (await hashPin(entry)) === stored;
}
