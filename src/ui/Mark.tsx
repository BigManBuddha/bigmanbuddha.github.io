import type { CSSProperties } from 'react';
import styles from './Mark.module.css';

/** The Slate logo mark: a yellow S on black. */
export function Mark({ size = 30 }: { size?: number }) {
  return <div className={styles.mark} style={{ '--size': `${size}px` } as CSSProperties} aria-hidden="true">S</div>;
}
