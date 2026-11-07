/** Which navigation to show for a screen width. Pure, so it's easy to test. */
import { FULL_SIDEBAR_MIN, PHONE_MAX } from '../domain/constants';

export type Layout = 'phone' | 'rail' | 'full';
export type SidebarPref = 'full' | 'rail' | null;

/**
 * phone: under PHONE_MAX, top bar + bottom tabs (sidebar preference ignored)
 * full / rail: the user's Hide/Show choice, or automatic by width when unset
 */
export function layoutFor(width: number, pref: SidebarPref): Layout {
  if (width < PHONE_MAX) return 'phone';
  if (pref) return pref;
  return width >= FULL_SIDEBAR_MIN ? 'full' : 'rail';
}
