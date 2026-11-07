import { useSlate } from '../state/SlateProvider';
import { Mark } from '../ui/Mark';
import styles from './Nav.module.css';
import { useNavEntries } from './useNavEntries';

/** Full sidebar for desktop. */
export function Sidebar({ onHide }: { onHide: () => void }) {
  const { state, act } = useSlate();
  const { entries, go } = useNavEntries();
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <Mark />
        <div className={styles.wordmark}>Slate</div>
      </div>

      <nav className={styles.list} aria-label="Main">
        {entries.map((n) => (
          <button key={n.key} className={styles.item} aria-current={n.active ? 'page' : undefined} onClick={() => go(n.key)}>
            <span className={styles.num}>{n.num}</span>
            <span className={styles.itemLabel}>{n.label}</span>
            {n.badge > 0 && <span className={styles.badge} data-tone={n.badgeTone}>{n.badge}</span>}
          </button>
        ))}
      </nav>

      <div className={styles.foot}>
        <p className={styles.note}>Stored on this device only. No account, no cloud.</p>
        <div className={styles.footButtons}>
          {state.pin && <button className={styles.smallButton} onClick={act.lock}>Lock now</button>}
          <button className={styles.smallButton} onClick={onHide}>← Hide</button>
        </div>
        <span className={styles.version}>Version {__APP_VERSION__}</span>
      </div>
    </aside>
  );
}
