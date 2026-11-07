# Slate

Caseload management for solo therapists and small practices. Slate tracks clients
by slot-based capacity, flags who needs action this week, forecasts availability,
and runs a guided weekly review. It is local-first: all data stays in the browser
on the user's device. There is no account, no server and no cloud.

## Getting started

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install        # once, and whenever package.json changes
npm run dev        # local app at http://localhost:5173 with live reload
```

| Command | What it does |
|---|---|
| `npm run dev` | Run locally with live reload |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Re-run tests as you edit |
| `npm run typecheck` | Check types without building |
| `npm run build` | Type-check and build the site into `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run check` | Type-check + tests (run before pushing) |

## Project structure

```
src/
  domain/        Pure business logic. No React, no browser. Same input, same output.
    types.ts       Data shapes (Client, WaitlistEntry, Settings, …)
    constants.ts   Fixed values: defaults, labels, thresholds, navigation
    dates.ts       Date helpers (dates are pinned to noon so DST never shifts a day)
    settings.ts    Safe readers for user-typed settings
    caseload.ts    Client status, slots, forecast, waitlist maths
    templates.ts   Default messages and placeholder filling
    sample.ts      Demo caseload
  services/      Browser side effects, each in one place
    storage.ts     localStorage (saved data + device-only layout prefs)
    backup.ts      Export / import with validation
    autosave.ts    Auto-save to a file (Chrome/Edge)
    pin.ts         PIN hashing and checking
    browser.ts     Dialogs, clipboard, scrolling
  state/         App state
    appState.ts    The state shape (saved data + what's on screen)
    actions.ts     Every change, as a pure function: (state, inputs) → patch
    commands.ts    What buttons call: an action plus its side effects
    derive.ts      Figures worked out from the data (urgent list, forecast…)
    SlateProvider.tsx  Holds state, saves it, exposes useSlate()
  ui/            Reusable building blocks (Button, Tag, Stat, Panel, Field…)
  layout/        Sidebar, rail, phone navigation, page frame
  features/      One folder per screen or panel, with its own styles
  styles/        global.css: font, colour tokens, reset
  test/          Test helpers
public/          Copied as-is: service worker, manifest, icons
```

**How a click flows:** a button calls a command (`act.inviteBack(client)`) →
the command applies a pure action (`actions.inviteBack`) → `SlateProvider`
updates state, saves it to localStorage and the auto-save file → screens
re-render from `state` and `derived`.

**Where to change things**

- A rule, such as when a client counts as "Decide now": `domain/caseload.ts`
- A threshold, label or default: `domain/constants.ts`
- Message wording: `domain/templates.ts`
- What a button does: `state/actions.ts` (plus `commands.ts` if it needs a dialog)
- How something looks: the `.module.css` file next to its component
- Colours and font: `styles/global.css`

## Styling

Each component has a CSS Module next to it (`Button.tsx` + `Button.module.css`),
so its styles are scoped to that component and can't clash with anything else.
Shared values (colours, the font) are CSS variables in `styles/global.css`.

Design rules: one typeface (Schibsted Grotesk, bundled, no external requests),
square edges, 2px black rules between sections, and no cards or pop-up boxes.
Colour is used only for status, so it reads at a glance: red means act now,
amber means soon or waiting, green means fine and grey means parked. To colour
any element by status, give it a `data-tone` attribute and use `var(--tone)`,
`var(--tone-ink)` or `var(--tone-text)` in its CSS.

The layout adapts to the screen: a full sidebar on desktop (which can be hidden),
a slim numbered rail on iPad, and a top bar with bottom tabs on iPhone.

## Tests

Tests sit next to the code they cover (`caseload.ts` → `caseload.test.ts`) and
run with [Vitest](https://vitest.dev). Logic tests run in plain Node. `App.test.tsx`
renders the real app in a simulated browser and walks the main journey.

When you fix a bug, write a failing test for it first.

## Saved data

Saved data lives in localStorage under the key `cmt_v1`, in the same shape as
backup files: `clients`, `waitlist`, `templates`, `pin`, `seeded`, `settings`,
`onboarded`. **Don't rename these.** Existing users' data would stop loading.
If the shape ever has to change, add a migration in `services/storage.ts`.

Layout preferences (the sidebar Hide/Show choice) are stored separately under
`slate_ui` and are never included in backups. The licence activation (`slate_licence`)
and device ID (`slate_device`) are also device-only. "Delete everything" leaves them
alone, so a buyer never has to re-activate just because they wiped their caseload.

## Licensing & payments

Slate is a hosted web app. Without a licence it runs as a **trial**: everything works
on the sample caseload, but adding your own clients or waitlist, or importing a backup,
opens the unlock panel. The gate is `requireLicence` in `state/commands.ts`.

**How a purchase works**

1. The buyer clicks **Buy Slate**, which opens your Stripe Payment Link. They pay £70.
2. Stripe sends them back to the app with `?session_id=…` in the address.
3. The app asks the licence server for the key (`GET /claim`). The server confirms
   with Stripe that the payment went through, creates the key (the same session
   always gives the same key) and emails it.
4. The app activates the key on this device (`POST /activate`). The server binds the
   key to the device's random ID and returns a signed activation.
5. The app stores that signed activation and checks it **offline** on every launch.
   It never needs to contact the server again.

**Rules:** one key works on one device. A buyer can move their key to a new device
themselves up to `MAX_TRANSFERS` times (2 by default); after that they email you and
you reset it. The old device keeps working, because Slate never checks in again after
activating. That was the trade-off chosen for working offline for good. As with any
check that runs on the buyer's own device, a determined technical user could get
around it. It stops casual key sharing, which is the realistic risk.

**Code:** the server is `licence-server/src/index.ts` (one file, with tests next to it).
The app side is `services/licence.ts` (checking, activating) and
`features/licence/Licence.tsx` (the unlock panel, the Settings row and the trial
banner, which is in `layout/AppShell.tsx`).

### One-time setup

You need free accounts with [Cloudflare](https://dash.cloudflare.com) and
[Stripe](https://dashboard.stripe.com). [Resend](https://resend.com) is optional:
it emails buyers their key. Do everything in Stripe **test mode** first.

**1. Licence server**

```bash
cd licence-server
npm install
npx wrangler login
npx wrangler kv namespace create LICENCES   # paste the id into wrangler.toml
npm run keys                                # prints the secrets + public key
npx wrangler secret put SIGNING_KEY         # paste each value from `npm run keys`
npx wrangler secret put KEY_SECRET
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put STRIPE_SECRET_KEY   # Stripe → Developers → API keys
npx wrangler secret put RESEND_API_KEY      # optional
```

In `wrangler.toml`, set `APP_ORIGIN` (where the app will live), `SUPPORT_EMAIL`
and `EMAIL_FROM`. Then run `npm run deploy` and note the URL it prints.

**2. Stripe**

- Products → add **Slate**, one-off price **£70**.
- Payment Links → create one for it. Under **After payment**, choose "Don't show
  confirmation page" and redirect to `https://<your app>/?session_id={CHECKOUT_SESSION_ID}`.
- Settings → Emails → turn on successful-payment receipts.

For the `STRIPE_SECRET_KEY`, a restricted key with **Checkout Sessions: Read** is enough.

**3. The app**

Fill in `.env` (committed, because none of its values are secret):
`VITE_LICENCE_API` (the server URL), `VITE_BUY_URL` (the Payment Link) and
`VITE_LICENCE_PUBLIC_KEY` (from `npm run keys`).

While `.env` has no public key, `npm run dev` treats the app as unlocked so you can
work on it. Production builds stay in trial until the key is set.

### Day to day

Use your `ADMIN_TOKEN` (keep it in a password manager):

```bash
SERVER=https://slate-licence.<you>.workers.dev
AUTH="Authorization: Bearer <ADMIN_TOKEN>"

# Free key for a tester (emails them if Resend is set up)
curl -X POST $SERVER/admin/issue -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","note":"tester"}'

# Someone lost their key
curl "$SERVER/admin/find?email=buyer@example.com" -H "$AUTH"

# Let a key be activated on a new device
curl -X POST $SERVER/admin/reset -H "$AUTH" -H "Content-Type: application/json" -d '{"key":"SLATE-…"}'

# After a refund: stop the key activating anywhere new
curl -X POST $SERVER/admin/revoke -H "$AUTH" -H "Content-Type: application/json" -d '{"key":"SLATE-…"}'
```

## Deployment

The repo is private, so the app and the licence server are both hosted on Cloudflare
(its free plan covers this). `.github/workflows/ci.yml` runs on every push and pull
request: type-check, test and build the app, and type-check and test the licence server.
On pushes to `main` it then deploys both. A failing test blocks deployment.

One-time setup:

1. Run `npm install` at the top level and in `licence-server/`, then commit both
   `package-lock.json` files. CI installs exactly those versions.
2. Create the app's hosting project: `npx wrangler pages project create slate`.
   Your app address will be `https://slate.pages.dev`. You can add your own domain
   in the Cloudflare dashboard. Use this address as `APP_ORIGIN`.
3. In Cloudflare, create an API token with **Workers Scripts: Edit**,
   **Workers KV Storage: Edit** and **Cloudflare Pages: Edit**.
4. In GitHub → Settings → Secrets and variables → Actions, add `CLOUDFLARE_API_TOKEN`
   and `CLOUDFLARE_ACCOUNT_ID` (shown in the Cloudflare dashboard sidebar).
5. Push to `main`.

The service worker (`public/sw.js`) makes the installed app work offline and
always fetches the latest release when online.

## Releasing

Every push to `main` goes live. A release just marks a version, so users see
an "update available" notice and you have a record of what changed.

1. As you work, add a line under **Unreleased** in `CHANGELOG.md`.
2. When you're ready to release, rename **Unreleased** to the new version and date,
   e.g. `## 1.1.0 — 2026-12-01`, and add a fresh empty `## Unreleased` above it.
3. Commit, then run one of:
   - `npm version patch`: fixes (1.0.0 → 1.0.1)
   - `npm version minor`: new features (1.0.0 → 1.1.0)
   - `npm version major`: changes to saved data or backups (1.0.0 → 2.0.0)
4. `git push --follow-tags`

The push to `main` deploys the new version. The tag triggers
`.github/workflows/release.yml`, which checks that the tag matches `package.json`,
re-runs the tests and creates a GitHub Release with that version's changelog notes
and a zip of the built app.

**Updates in the app:** each build publishes `version.json`. Open copies of Slate
check it hourly, and whenever the tab is reopened. When a newer version is live,
a banner offers to reload. Data is unaffected because it's already saved.

## Repo housekeeping

- Issue forms (bug report, feature request) ask for the version and device and
  remind people not to share client details.
- The pull request template has a short pre-merge checklist.
- Dependabot opens one grouped dependency-update pull request a month. CI tests it
  before you merge.
