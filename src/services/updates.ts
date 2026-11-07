/**
 * "Update available" check. Each build publishes version.json next to the app
 * (see vite.config.ts). The open app compares it with its own version; if the
 * server has a newer one, a banner offers a reload. Fails silently when offline.
 */

const CHECK_EVERY_MS = 60 * 60 * 1000; // hourly, plus whenever the tab is reopened

/** True if version `a` is newer than `b` ("1.2.0" > "1.1.9"). */
export function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: unknown };
    return typeof data.version === 'string' ? data.version : null;
  } catch {
    return null;
  }
}

/** Calls onUpdate(newVersion) once a newer release is live. Returns a stop function. */
export function watchForUpdates(current: string, onUpdate: (version: string) => void): () => void {
  let stopped = false;
  const check = async () => {
    const latest = await fetchLatestVersion();
    if (!stopped && latest && isNewer(latest, current)) onUpdate(latest);
  };
  const onVisible = () => { if (document.visibilityState === 'visible') void check(); };

  void check();
  const timer = setInterval(check, CHECK_EVERY_MS);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
