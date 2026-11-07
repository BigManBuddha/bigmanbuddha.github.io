# Slate: handoff notes

Status as of 7 Nov 2026. Written so anyone, human or Claude Code, can pick this up.

## What Slate is

A caseload manager for solo practitioners, first built for speech and language therapists.
It tracks clients in blocks of sessions, slot-based capacity, a forecast, a waitlist and
message templates, plus a guided weekly review. It is **local-first**: all client data lives
in the browser's localStorage on the user's device. No accounts and no server ever hold client data.

## What exists

| Thing | Where | State |
|---|---|---|
| App source (React 18 + TypeScript + Vite) | `slate/` repo, `src/` | Written; tests pass in a browser shim. **Never yet built with real `tsc`/`vite`.** |
| Tests (Vitest) | `src/**/*.test.ts(x)`, `licence-server/src/*.test.ts` | ~93 tests |
| Licence server (Cloudflare Worker + KV) | `licence-server/` | Written and tested in the shim. Not deployed. |
| CI/CD | `.github/workflows/ci.yml`, `release.yml` | ci: typecheck → test → build → deploy to Cloudflare on `main`. release: on `v*` tags. Not yet run. |
| Single-file tester build (legacy) | `caseload-pwa/index.html` + `sw.js` | Works today. Same design, no licensing. Used for the current tester on GitHub Pages. |
| Marketing site (static HTML/CSS) | `site/export/` → `Web/additional/slate/` | Done. Placeholder links still to replace. |

Saved data: localStorage key `cmt_v1` (same shape as backup files). **Never rename it**, or existing
users lose their data. The legacy tester build and the React app share this key, so data carries
over if the app stays on the same web address (origin).

## Architecture (React app)

```
src/domain/    pure logic (dates, caseload maths, templates, sample data, types, constants)
src/services/  browser side effects (storage, backup, autosave, pin, licence, updates)
src/state/     appState, actions (pure), commands (side effects), derive, SlateProvider/useSlate
src/ui/        primitives (Button, Tag, Stat, Panel, Field…)
src/layout/    sidebar / rail / phone nav, AppShell (banners)
src/features/  one folder per screen/panel, CSS Module next to each
```

Known feedback: the split is too fine-grained, which makes it hard to follow interactions. A
consolidation pass (merge ui/ primitives, fold small layout/feature files together) is wanted
but parked.

## Licensing (built, not live)

Trial = sample data only; adding clients/waitlist or importing needs a licence (`requireLicence`
in `state/commands.ts`). Flow: Stripe Payment Link → back to app with `?session_id` → `/claim`
(key emailed via Resend) → `/activate` (1 device, `MAX_TRANSFERS` self-serve moves, ECDSA-signed)
→ app verifies offline forever. Admin curl endpoints issue tester keys, reset and revoke.
Full setup steps are in README → "Licensing & payments".

**Important:** a production build with an empty `VITE_LICENCE_PUBLIC_KEY` runs in trial mode, so
testers can't add clients. Before testers use the React build, either issue them keys or add a
build flag (e.g. `VITE_REQUIRE_LICENCE=false`) that skips the gate.

## To do, in order

1. **Repo hygiene:** the GitHub repo has an older copy plus committed `node_modules/` and `dist/`.
   Copy in the latest files *including dotfiles* (`.gitignore`, `.github/`, `.env`, `.nvmrc`),
   then `git rm -r --cached node_modules dist` and commit.
2. **First real build:** `npm install && npm run check && npm run build` at the top level, and
   `npm install && npm test && npm run typecheck` in `licence-server/`. Fix any strict-type
   errors (the code has never been through real `tsc`). Commit both `package-lock.json` files.
3. **Hosting:** Cloudflare Pages project `slate` and the Worker (README → "Deployment"). Add the
   `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` GitHub secrets.
4. **Moving the tester:** their data is tied to the GitHub Pages address. Before switching them
   to the new address, they must **Backup → Export** on the old site and **Import** on the new one.
5. **Stripe** (test mode first): £70 product, Payment Link redirecting to
   `<app>/?session_id={CHECKOUT_SESSION_ID}`, a restricted key (Checkout Sessions: Read),
   automatic tax as appropriate. Test with card 4242 4242 4242 4242. Then go live.
6. **Marketing site:** replace the placeholder buy link, app URL and contact email in
   `site/export/index.html`, then publish it. Add a short privacy policy page.
7. **Offline app:** keep it as an installable web app, and add an "Install Slate" prompt in the
   app plus a "How to install" section on the marketing site. A desktop wrapper (Tauri) only if
   buyers ask.
8. **Later:** consolidate files (see above); step 6 of the roadmap (extra features, Instagram
   video ad).
