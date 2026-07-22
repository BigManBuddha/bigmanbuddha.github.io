# Caseload Management Tool

A local-first caseload management app for allied health professionals.
All data stays in the browser on your device — no account, no cloud, nothing sent anywhere.

## Deploy to GitHub Pages
1. Create a new repository and push the contents of this folder to it.
2. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Pick your branch (e.g. `main`) and folder `/ (root)`, then **Save**.
4. After a minute your app is live at `https://<username>.github.io/<repo>/`.

`index.html` and `sw.js` must stay together at the site root — the service
worker (which enables offline + the install prompt) is registered from `./sw.js`.

## Install as an app
Once it's live at the https URL:
- **Chrome / Edge (desktop):** open the URL, click the install icon in the address bar.
- **iPhone / iPad (Safari):** Share → Add to Home Screen.
- **Android (Chrome):** menu → Install app.

Opening `index.html` directly as a file also works fully offline — it just
can't show the install prompt (that needs the https URL above).

## Backing up your data
- **Chrome / Edge:** Backup tab → Turn on auto-save, and pick a file. Every
  change writes to it automatically.
- **Safari / Firefox:** Backup tab → Export after each session. Import restores.

## Files
- `index.html` — the app (single self-contained file; open it directly or host it).
- `sw.js` — service worker for offline + installability (host alongside index.html).
- `src/` — editable source. `Caseload Management Tool.dc.html` is the working file;
  `support.js` is its runtime. Rebuild `index.html` from these when you make changes.
