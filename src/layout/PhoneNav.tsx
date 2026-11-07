import { useState } from 'react';
import { NAV, PHONE_MORE, PHONE_TABS } from '../domain/constants';
import type { ViewKey } from '../domain/types';
import { useEscape } from '../lib/useEscape';
import { useSlate } from '../state/SlateProvider';
import { Mark } from '../ui/Mark';
import styles from './Nav.module.css';
import { useNavEntries } from './useNavEntries';

/** Sticky title bar at the top of the phone layout. */
export function PhoneTopBar() {
  const { state, act } = useSlate();
  const title = NAV.find((n) => n.key === state.view)?.label ?? '';
  return (
    <header className={styles.topBar}>
      <Mark size={28} />
      <div className={styles.topTitle}>{title}</div>
      {state.pin && <button className={styles.smallButton} onClick={act.lock}>Lock</button>}
    </header>
  );
}

/** Bottom tab bar (four main screens + More) and the More sheet. */
export function PhoneTabs() {
  const { entries, go } = useNavEntries();
  const [moreOpen, setMoreOpen] = useState(false);
  const activeKey = entries.find((n) => n.active)?.key;

  const open = (key: ViewKey) => { setMoreOpen(false); go(key); };
  const tabs = entries.filter((n) => PHONE_TABS.includes(n.key));
  const moreItems = entries.filter((n) => PHONE_MORE.includes(n.key));
  const moreActive = moreOpen || (activeKey !== undefined && PHONE_MORE.includes(activeKey));

  return (
    <>
      <nav className={styles.tabs} aria-label="Main">
        {tabs.map((n) => (
          <button key={n.key} className={styles.tab} aria-current={n.active && !moreOpen ? 'page' : undefined} onClick={() => open(n.key)}>
            {n.short}
            {n.badge > 0 && <span className={styles.tabBadge} data-tone={n.badgeTone}>{n.badge}</span>}
          </button>
        ))}
        <button className={styles.tab} aria-current={moreActive ? 'page' : undefined} onClick={() => setMoreOpen(true)}>More</button>
      </nav>
      {moreOpen && <MoreSheet items={moreItems} onPick={open} onClose={() => setMoreOpen(false)} />}
    </>
  );
}

function MoreSheet({ items, onPick, onClose }: {
  items: ReturnType<typeof useNavEntries>['entries'];
  onPick: (key: ViewKey) => void;
  onClose: () => void;
}) {
  useEscape(onClose);
  return (
    <div className={styles.more} role="dialog" aria-modal="true" aria-label="More">
      <div className={styles.moreHead}>
        <div className={styles.moreTitle}>More</div>
        <button className={styles.moreClose} onClick={onClose}>Close</button>
      </div>
      {items.map((n) => (
        <button key={n.key} className={styles.moreItem} onClick={() => onPick(n.key)}>
          <span className={styles.moreNum}>{n.num}</span>{n.label}
        </button>
      ))}
      <p className={styles.moreNote}>Stored on this device only. No account, no cloud. Version {__APP_VERSION__}</p>
    </div>
  );
}
