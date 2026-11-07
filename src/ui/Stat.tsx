import type { StatData } from '../state/derive';
import styles from './Stat.module.css';

/** A headline figure with a coloured top rule (and optional bar). */
export function Stat({ label, value, unit, sub, tone, barPct }: StatData) {
  return (
    <div className={styles.stat} data-tone={tone}>
      <div className={styles.label}>{label}</div>
      <div className={styles.figure}>
        <span className={styles.value}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {barPct !== undefined && (
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${Math.min(100, barPct)}%` }} />
        </div>
      )}
      <div className={styles.sub}>{sub}</div>
    </div>
  );
}
