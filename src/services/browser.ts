/** Thin wrappers around browser dialogs and the clipboard, safe to call in tests. */

export function notify(message: string): void {
  if (typeof globalThis.alert === 'function') globalThis.alert(message);
}

export function confirmBox(message: string): boolean {
  return typeof globalThis.confirm === 'function' ? globalThis.confirm(message) : true;
}

export function copyToClipboard(text: string): Promise<void> {
  const clipboard = globalThis.navigator?.clipboard;
  if (clipboard?.writeText) return clipboard.writeText(text).catch(() => undefined);
  return Promise.resolve();
}

export function scrollToTop(): void {
  try { globalThis.scrollTo?.(0, 0); } catch { /* not available (tests) */ }
}
