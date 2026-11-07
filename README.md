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
`slate_ui` and are never included in backups.

## Deployment

`.github/workflows/ci.yml` runs on every push and pull request: install →
type-check → test → build. On pushes to `main`, it also publishes `dist/` to
GitHub Pages. A failing test blocks the release.

One-time setup:

1. Run `npm install` locally and commit the `package-lock.json` it creates.
   CI installs exactly those versions.
2. In the GitHub repo: **Settings → Pages → Build and deployment → Source:
   GitHub Actions**.
3. Push to `main`. The site appears at `https://<username>.github.io/<repo>/`.

The service worker (`public/sw.js`) makes the installed app work offline and
always fetches the latest release when online.

## Versioning

The version lives in `package.json` and is shown in the app's sidebar. To bump it,
run `npm version patch` (fixes), `npm version minor` (features) or
`npm version major` (breaking changes).
