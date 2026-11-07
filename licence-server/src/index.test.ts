import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { handle, KEY_PATTERN, type Env } from './index';

const APP = 'https://app.test';
const ADMIN = 'admin-token';
let signingKey = '';
let publicKey: CryptoKey;

beforeAll(async () => {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  publicKey = pair.publicKey;
  signingKey = JSON.stringify(await crypto.subtle.exportKey('jwk', pair.privateKey));
});

afterEach(() => vi.unstubAllGlobals());

function makeEnv(): Env & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    LICENCES: { get: async (k) => store.get(k) ?? null, put: async (k, v) => { store.set(k, v); } },
    STRIPE_SECRET_KEY: 'sk_test', SIGNING_KEY: signingKey, KEY_SECRET: 'key-secret', ADMIN_TOKEN: ADMIN,
    APP_ORIGIN: APP, SUPPORT_EMAIL: 'help@test', MAX_TRANSFERS: '1',
  };
}

/** Pretend to be Stripe: every session has the given payment status. */
function stubStripe(paymentStatus: string) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ payment_status: paymentStatus, customer_details: { email: 'buyer@test' } }))));
}

const get = (env: Env, path: string, headers: Record<string, string> = {}) =>
  handle(new Request(`https://licence.test${path}`, { headers: { Origin: APP, ...headers } }), env);

const post = (env: Env, path: string, body: unknown, headers: Record<string, string> = {}) =>
  handle(new Request(`https://licence.test${path}`, {
    method: 'POST', headers: { Origin: APP, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  }), env);

const asAdmin = { Authorization: `Bearer ${ADMIN}` };

async function verify(activation: { key: string; deviceId: string; issuedAt: string; signature: string }) {
  const b64 = activation.signature.replace(/-/g, '+').replace(/_/g, '/');
  const sig = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const message = new TextEncoder().encode(`slate-licence-v1|${activation.key}|${activation.deviceId}|${activation.issuedAt}`);
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, sig, message);
}

async function issueKey(env: Env): Promise<string> {
  const res = await post(env, '/admin/issue', { email: 'tester@test', note: 'tester' }, asAdmin);
  return (await res.json()).licence.key;
}

describe('claim after checkout', () => {
  it('refuses unpaid sessions', async () => {
    stubStripe('unpaid');
    expect((await get(makeEnv(), '/claim?session_id=cs_test_123')).status).toBe(402);
  });

  it('rejects a malformed session id without calling Stripe', async () => {
    expect((await get(makeEnv(), '/claim?session_id=nope')).status).toBe(400);
  });

  it('issues a key once, and the same key on every retry', async () => {
    stubStripe('paid');
    const env = makeEnv();
    const first = await (await get(env, '/claim?session_id=cs_test_123')).json();
    const again = await (await get(env, '/claim?session_id=cs_test_123')).json();
    expect(KEY_PATTERN.test(first.key)).toBe(true);
    expect(again.key).toBe(first.key);
    expect([...env.store.keys()].filter((k) => k.startsWith('key:'))).toHaveLength(1);
  });

  it('allows the app origin to call it (CORS)', async () => {
    stubStripe('paid');
    const res = await get(makeEnv(), '/claim?session_id=cs_test_123');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(APP);
  });
});

describe('activation', () => {
  it('rejects unknown keys', async () => {
    expect((await post(makeEnv(), '/activate', { key: 'SLATE-AAAA-BBBB-CCCC-DDDD', deviceId: 'device-one' })).status).toBe(404);
  });

  it('returns an activation the app can verify', async () => {
    const env = makeEnv();
    const key = await issueKey(env);
    const res = await post(env, '/activate', { key, deviceId: 'device-one' });
    expect(res.status).toBe(200);
    expect(await verify((await res.json()).activation)).toBe(true);
  });

  it('the same device can activate again (e.g. after clearing the browser)', async () => {
    const env = makeEnv();
    const key = await issueKey(env);
    await post(env, '/activate', { key, deviceId: 'device-one' });
    expect((await post(env, '/activate', { key, deviceId: 'device-one' })).status).toBe(200);
  });

  it('moving to a new device uses a transfer; after the limit it is refused', async () => {
    const env = makeEnv(); // MAX_TRANSFERS = 1
    const key = await issueKey(env);
    await post(env, '/activate', { key, deviceId: 'device-one' });
    expect((await post(env, '/activate', { key, deviceId: 'device-two' })).status).toBe(200);
    expect((await post(env, '/activate', { key, deviceId: 'device-three' })).status).toBe(409);
  });
});

describe('admin', () => {
  it('needs the admin token', async () => {
    expect((await post(makeEnv(), '/admin/issue', { email: 'x@test' })).status).toBe(401);
    expect((await post(makeEnv(), '/admin/issue', { email: 'x@test' }, { Authorization: 'Bearer wrong' })).status).toBe(401);
  });

  it('reset frees a key for a new device; revoke stops it', async () => {
    const env = makeEnv();
    const key = await issueKey(env);
    await post(env, '/activate', { key, deviceId: 'device-one' });
    await post(env, '/activate', { key, deviceId: 'device-two' });
    await post(env, '/admin/reset', { key }, asAdmin);
    expect((await post(env, '/activate', { key, deviceId: 'device-three' })).status).toBe(200);
    await post(env, '/admin/revoke', { key }, asAdmin);
    expect((await post(env, '/activate', { key, deviceId: 'device-three' })).status).toBe(404);
  });

  it('finds keys by email', async () => {
    const env = makeEnv();
    const key = await issueKey(env);
    const found = await (await get(env, '/admin/find?email=TESTER@test', asAdmin)).json();
    expect(found.licences[0].key).toBe(key);
  });
});
