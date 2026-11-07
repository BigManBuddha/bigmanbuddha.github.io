import { useSlate } from '../state/SlateProvider';
import { Mark } from '../ui/Mark';
import styles from './Nav.module.css';
import { useNavEntries } from './useNavEntries';

/** Slim numbered rail: iPad, or desktop with the sidebar hidden. */
export function Rail({ onShow }: { onShow: () => void }) {
  const { state, act } = useSlate();
  const { entries, go } = useNavEntries();
  return (
    <aside className={styles.rail}>
      <div className={styles.railMark}><Mark /></div>

      <nav className={styles.railList} aria-label="Main">
        {entries.map((n) => (
          <button key={n.key} className={styles.railItem} aria-current={n.active ? 'page' : undefined} title={n.label} onClick={() => go(n.key)}>
            <span className={styles.railNum}>{n.num}</span>
            <span className={styles.railShort}>{n.short}</span>
            {n.badge > 0 && <span className={styles.railBadge} data-tone={n.badgeTone}>{n.badge}</span>}
          </button>
        ))}
      </nav>

      <div className={styles.railFoot}>
        {state.pin && <button className={styles.railButton} onClick={act.lock} title="Lock now">Lock</button>}
        <button className={styles.railButton} onClick={onShow} title="Show sidebar" aria-label="Show sidebar">→</button>
      </div>
    </aside>
  );
}
