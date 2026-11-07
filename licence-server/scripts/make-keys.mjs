// One-off setup: prints the secrets the licence server needs and the public key for the app.
// Run once with `npm run keys`. Never commit the private values.
import { webcrypto as crypto } from 'node:crypto';

const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const privateJwk = JSON.stringify(await crypto.subtle.exportKey('jwk', pair.privateKey));
const publicJwk = JSON.stringify(await crypto.subtle.exportKey('jwk', pair.publicKey));
const random = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');

console.log(`
=== SECRETS: paste each into \`npx wrangler secret put <NAME>\` (keep them private) ===

SIGNING_KEY
${privateJwk}

KEY_SECRET
${random()}

ADMIN_TOKEN   (also save it in your password manager: you need it to issue tester keys)
${random()}

=== PUBLIC: paste into the app's .env file ===

VITE_LICENCE_PUBLIC_KEY='${publicJwk}'
`);
