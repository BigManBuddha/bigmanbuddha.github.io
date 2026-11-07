import { beforeAll, describe, expect, it } from 'vitest';
import type { AutoSaveControls } from './autosave';
import { looksLikeKey, normalizeKey, signedMessage, verifyActivation, type Activation } from './licence';
import { createCommands } from '../state/commands';
import type { AppState } from '../state/appState';
import { makeClient, makeState } from '../test/helpers';

let publicJwk = '';
let privateKey: CryptoKey;

beforeAll(async () => {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  privateKey = pair.privateKey;
  publicJwk = JSON.stringify(await crypto.subtle.exportKey('jwk', pair.publicKey));
});

/** Sign like the licence server does. */
async function serverSign(key: string, deviceId: string): Promise<Activation> {
  const a = { key, deviceId, issuedAt: '2026-11-07T10:00:00.000Z' };
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(signedMessage(a)));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { ...a, signature };
}

const KEY = 'SLATE-ABCD-EFGH-JKLM-NPQR';

describe('licence keys', () => {
  it('normalizeKey forgives case, spaces and missing dashes', () => {
    expect(normalizeKey('slate abcd efgh jklm npqr')).toBe(KEY);
    expect(normalizeKey('ABCDEFGHJKLMNPQR')).toBe(KEY);
    expect(normalizeKey(' SLATE-ABCD-EFGH-JKLM-NPQR ')).toBe(KEY);
  });

  it('looksLikeKey rejects wrong lengths and confusable letters', () => {
    expect(looksLikeKey(KEY)).toBe(true);
    expect(looksLikeKey('SLATE-ABCD-EFGH-JKLM')).toBe(false);
    expect(looksLikeKey('SLATE-ABCD-EFGH-JKLM-NPQO')).toBe(false); // O is never used
  });

  it('accepts a genuine activation for this device', async () => {
    expect(await verifyActivation(await serverSign(KEY, 'device-one'), 'device-one', publicJwk)).toBe(true);
  });

  it('rejects an activation copied from another device', async () => {
    expect(await verifyActivation(await serverSign(KEY, 'device-one'), 'device-two', publicJwk)).toBe(false);
  });

  it('rejects a tampered activation', async () => {
    const a = await serverSign(KEY, 'device-one');
    expect(await verifyActivation({ ...a, key: 'SLATE-ZZZZ-ZZZZ-ZZZZ-ZZZZ' }, 'device-one', publicJwk)).toBe(false);
    expect(await verifyActivation(null, 'device-one', publicJwk)).toBe(false);
  });
});

describe('trial limits', () => {
  const noAutosave = { restore: async () => {}, connect: async () => {}, reconnect: async () => {}, disconnect: async () => {}, unlink() {}, schedule() {}, cancel() {} } as AutoSaveControls;

  function setup(over: Partial<AppState>) {
    let state = makeState(over);
    const act = createCommands({ update: (fn) => { state = { ...state, ...fn(state) }; }, get: () => state, autosave: noAutosave });
    return { act, get: () => state };
  }

  it('in the trial, adding a client opens the unlock panel instead', () => {
    const { act, get } = setup({ licence: 'trial' });
    act.openClient(null);
    expect(get().panel?.kind).toBe('licence');
  });

  it('in the trial, sample clients can still be opened and edited', () => {
    const { act, get } = setup({ licence: 'trial' });
    act.openClient(makeClient());
    expect(get().panel?.kind).toBe('client');
  });

  it('in the trial, adding to the waitlist and importing are blocked', () => {
    const { act, get } = setup({ licence: 'trial' });
    act.openWaitlist(null);
    expect(get().panel?.kind).toBe('licence');
    expect(act.importBackup(JSON.stringify({ clients: [] }))).toBe(false);
  });

  it('with a licence, adding a client works', () => {
    const { act, get } = setup({ licence: 'active' });
    act.openClient(null);
    expect(get().panel?.kind).toBe('client');
  });
});
