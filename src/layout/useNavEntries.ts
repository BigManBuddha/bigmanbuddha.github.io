import { NAV, type NavItem } from '../domain/constants';
import type { Tone, ViewKey } from '../domain/types';
import { useSlate } from '../state/SlateProvider';

export interface NavEntry extends NavItem {
  /** "01" … "07" */
  num: string;
  active: boolean;
  badge: number;
  badgeTone: Tone;
}

/** Navigation items with their badge counts. Red = needs you, amber = waitlist. */
export function useNavEntries(): { entries: NavEntry[]; go: (key: ViewKey) => void } {
  const { state, derived, act } = useSlate();
  const entries = NAV.map((item, i) => ({
    ...item,
    num: String(i + 1).padStart(2, '0'),
    active: state.view === item.key,
    badge: derived.badges[item.key] ?? 0,
    badgeTone: (item.key === 'waitlist' ? 'amber' : 'red') as Tone,
  }));
  return { entries, go: act.go };
}
