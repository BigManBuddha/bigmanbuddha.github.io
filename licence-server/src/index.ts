/**
 * Slate licence server: a Cloudflare Worker with one KV store.
 *
 *   GET  /claim?session_id=…        After Stripe checkout: returns the buyer's key (creates and emails it on first call)
 *   POST /activate {key, deviceId}  Binds a key to one device and returns a signed activation
 *
 *   Admin (header "Authorization: Bearer <ADMIN_TOKEN>"):
 *   POST /admin/issue  {email, note?}  Make a key by hand, e.g. for testers
 *   POST /admin/reset  {key}           Free a key so it can be activated on a new device
 *   POST /admin/revoke {key}           Stop a key activating again (refunds)
 *   GET  /admin/find?email=…           Look up a customer's keys
 *
 * The app checks the activation signature offline with the matching public key,
 * so after activating once Slate never needs to contact this server again.
 * Stored per key: buyer email, how it was issued, and a random device ID. Never any client data.
 */

/* ---------- types ---------- */

/** The parts of Cloudflare KV we use (kept minimal so tests can use a Map). */
export interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface Env {
  LICENCES: KV;
  /** Stripe secret or restricted key with read access to Checkout Sessions. */
  STRIPE_SECRET_KEY: string;
  /** Private ECDSA P-256 key as JWK JSON (from `npm run keys`). */
  SIGNING_KEY: string;
  /** Secret used to turn a Stripe session into the same key every time. */
  KEY_SECRET: string;
  ADMIN_TOKEN: string;
  /** Where the app is hosted, e.g. https://app.slate.example. Allowed to call /claim and /activate. */
  APP_ORIGIN: string;
  SUPPORT_EMAIL: string;
  /** How many times a buyer can move their key to a new device themselves. */
  MAX_TRANSFERS?: string;
  /** Optional: send the key by email via Resend. */
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}

interface Licence {
  key: string;
  email: string;
  /** "stripe:<session id>" or "admin:<note>" */
  source: string;
  createdAt: string;
  deviceId: string | null;
  activatedAt: string | null;
  transfers: number;
  revoked: boolean;
}

/* ---------- keys ---------- */

/** No 0/O or 1/I, so keys are easy to read and type. 32 characters, so each byte maps evenly. */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const KEY_PATTERN = /^SLATE(-[2-9A-HJ-NP-Z]{4}){4}$/;
const DEVICE_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
const SIGNED_PREFIX = 'slate-licence-v1';

function formatKey(bytes: Uint8Array): string {
  const chars = Array.from(bytes.slice(0, 16), (b) => ALPHABET[b % 32]).join('');
  return 'SLATE-' + chars.match(/.{4}/g)!.join('-');
}

function randomKey(): string {
  return formatKey(crypto.getRandomValues(new Uint8Array(16)));
}

/** The same Stripe session always gives the same key, so retries can't create duplicates. */
async function keyForSession(sessionId: string, env: Env): Promise<string> {
  const secret = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.KEY_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', secret, new TextEncoder().encode(`session:${sessionId}`));
  return formatKey(new Uint8Array(mac));
}

function base64Url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sign(env: Env, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('jwk', JSON.parse(env.SIGNING_KEY), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(message));
  return base64Url(signature);
}

/* ---------- storage ---------- */

async function getLicence(env: Env, key: string): Promise<Licence | null> {
  const raw = await env.LICENCES.get(`key:${key}`);
  return raw ? (JSON.parse(raw) as Licence) : null;
}

async function saveLicence(env: Env, licence: Licence): Promise<void> {
  await env.LICENCES.put(`key:${licence.key}`, JSON.stringify(licence));
}

async function createLicence(env: Env, key: string, email: string, source: string): Promise<Licence> {
  const licence: Licence = { key, email, source, createdAt: new Date().toISOString(), deviceId: null, activatedAt: null, transfers: 0, revoked: false };
  await saveLicence(env, licence);
  if (email) {
    const indexKey = `email:${email.toLowerCase()}`;
    const keys = JSON.parse((await env.LICENCES.get(indexKey)) ?? '[]') as string[];
    if (!keys.includes(key)) await env.LICENCES.put(indexKey, JSON.stringify([...keys, key]));
  }
  return licence;
}

/* ---------- Stripe & email ---------- */

interface StripeSession { payment_status: string; customer_details?: { email?: string | null } | null }

async function stripeSession(sessionId: string, env: Env): Promise<StripeSession | null> {
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Stripe responded ${res.status}`);
  return (await res.json()) as StripeSession;
}

async function emailKey(env: Env, to: string, key: string): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !to) return;
  const text = [
    'Thank you for buying Slate.',
    '',
    `Your licence key: ${key}`,
    '',
    `To unlock Slate, open ${env.APP_ORIGIN}, go to Settings → Licence and enter this key.`,
    'Activation happens once and needs internet. After that Slate works offline.',
    '',
    'One key unlocks Slate on one device. If you move to a new device, enter the same key there.',
    "If it says the key is in use, reply to this email and we'll sort it out.",
    '',
    'Keep this email somewhere safe.',
  ].join('\n');
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to, reply_to: env.SUPPORT_EMAIL, subject: 'Your Slate licence key', text }),
    });
  } catch (e) {
    console.error('Email failed', e); // the key is still shown in the app
  }
}

/* ---------- responses ---------- */

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function withCors(res: Response, req: Request, env: Env): Response {
  const origin = req.headers.get('Origin');
  if (origin && origin === env.APP_ORIGIN) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    res.headers.set('Vary', 'Origin');
  }
  return res;
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null);
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/* ---------- public endpoints ---------- */

async function claim(url: URL, env: Env): Promise<Response> {
  const sessionId = url.searchParams.get('session_id') ?? '';
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return json({ error: 'Missing or invalid purchase reference.' }, 400);

  const session = await stripeSession(sessionId, env);
  if (!session) return json({ error: "We couldn't find that purchase." }, 404);
  if (session.payment_status !== 'paid') return json({ error: "Your payment hasn't completed yet. Refresh this page in a minute." }, 402);

  const key = await keyForSession(sessionId, env);
  if (!(await getLicence(env, key))) {
    const email = session.customer_details?.email ?? '';
    await createLicence(env, key, email, `stripe:${sessionId}`);
    await emailKey(env, email, key);
  }
  return json({ key });
}

async function activate(req: Request, env: Env): Promise<Response> {
  const body = await readBody(req);
  const key = text(body.key).toUpperCase();
  const deviceId = text(body.deviceId);
  if (!KEY_PATTERN.test(key) || !DEVICE_PATTERN.test(deviceId)) return json({ error: "That doesn't look like a Slate key." }, 400);

  const licence = await getLicence(env, key);
  if (!licence || licence.revoked) return json({ error: "We don't recognise that key. Check it matches the one in your receipt email." }, 404);

  const maxTransfers = Number(env.MAX_TRANSFERS ?? 2);
  if (licence.deviceId !== deviceId) {
    if (licence.deviceId) {
      if (licence.transfers >= maxTransfers) {
        return json({ error: `This key is already active on another device. Email ${env.SUPPORT_EMAIL} and we'll move it for you.` }, 409);
      }
      licence.transfers += 1;
    }
    licence.deviceId = deviceId;
    licence.activatedAt = new Date().toISOString();
    await saveLicence(env, licence);
  }

  const issuedAt = new Date().toISOString();
  const signature = await sign(env, `${SIGNED_PREFIX}|${key}|${deviceId}|${issuedAt}`);
  return json({ activation: { key, deviceId, issuedAt, signature }, transfersLeft: maxTransfers - licence.transfers });
}

/* ---------- admin ---------- */

/** Compares digests so the check takes the same time whatever the input. */
async function isAdmin(req: Request, env: Env): Promise<boolean> {
  const given = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!env.ADMIN_TOKEN || !given) return false;
  const digest = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  const [a, b] = await Promise.all([digest(given), digest(env.ADMIN_TOKEN)]);
  return a.every((byte, i) => byte === b[i]);
}

async function admin(req: Request, url: URL, env: Env): Promise<Response> {
  if (!(await isAdmin(req, env))) return json({ error: 'Unauthorised' }, 401);
  const route = `${req.method} ${url.pathname}`;

  if (route === 'GET /admin/find') {
    const email = (url.searchParams.get('email') ?? '').toLowerCase();
    const keys = JSON.parse((await env.LICENCES.get(`email:${email}`)) ?? '[]') as string[];
    return json({ licences: await Promise.all(keys.map((k) => getLicence(env, k))) });
  }

  const body = await readBody(req);

  if (route === 'POST /admin/issue') {
    const email = text(body.email);
    const licence = await createLicence(env, randomKey(), email, `admin:${text(body.note) || 'manual'}`);
    if (body.sendEmail !== false) await emailKey(env, email, licence.key);
    return json({ licence });
  }

  const licence = await getLicence(env, text(body.key).toUpperCase());
  if (!licence) return json({ error: 'No such key' }, 404);

  if (route === 'POST /admin/reset') {
    Object.assign(licence, { deviceId: null, activatedAt: null, transfers: 0 });
  } else if (route === 'POST /admin/revoke') {
    licence.revoked = true;
  } else {
    return json({ error: 'Not found' }, 404);
  }
  await saveLicence(env, licence);
  return json({ licence });
}

/* ---------- entry point ---------- */

export async function handle(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  if (req.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }), req, env);
  try {
    if (url.pathname.startsWith('/admin/')) return await admin(req, url, env);
    if (req.method === 'GET' && url.pathname === '/claim') return withCors(await claim(url, env), req, env);
    if (req.method === 'POST' && url.pathname === '/activate') return withCors(await activate(req, env), req, env);
    return json({ error: 'Not found' }, 404);
  } catch (e) {
    console.error(e);
    return withCors(json({ error: 'Something went wrong on our side. Please try again.' }, 500), req, env);
  }
}

export default { fetch: handle };
