import { useCallback, useEffect, useState } from 'react';
import { readUiPrefs, writeUiPrefs } from '../services/storage';
import type { SidebarPref } from './layout';

/** Window width, updated on resize. */
export function useViewportWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

/** The sidebar Hide/Show choice, remembered on this device only. */
export function useSidebarPref(): [SidebarPref, (pref: 'full' | 'rail') => void] {
  const [pref, setPref] = useState<SidebarPref>(() => readUiPrefs().sidebar ?? null);
  const save = useCallback((next: 'full' | 'rail') => {
    writeUiPrefs({ ...readUiPrefs(), sidebar: next });
    setPref(next);
  }, []);
  return [pref, save];
}
