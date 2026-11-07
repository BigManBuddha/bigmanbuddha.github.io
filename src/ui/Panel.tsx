import type { CSSProperties, ReactNode } from 'react';
import { useEscape } from '../lib/useEscape';
import { Button } from './Button';
import styles from './Panel.module.css';

interface PanelProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Highlighted strip under the header. */
  notice?: ReactNode;
  footer: ReactNode;
  children: ReactNode;
  onClose: () => void;
  /** Max width in px (full width on phones). */
  width?: number;
  /** Red edge and title, for destructive actions. */
  danger?: boolean;
}

/** Slides in from the right over the current screen. Escape or the backdrop closes it. */
export function Panel({ title, subtitle, notice, footer, children, onClose, width = 560, danger }: PanelProps) {
  useEscape(onClose);
  return (
    <div className={styles.root}>
      <div className={styles.backdrop} onClick={onClose} />
      <aside
        className={styles.panel}
        style={{ '--panel-width': `${width}px` } as CSSProperties}
        data-danger={danger || undefined}
        role="dialog"
        aria-modal="true"
      >
        <header className={styles.head}>
          <div>
            <h2 className={styles.title}>{title}</h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          <Button variant="link" onClick={onClose}>Close</Button>
        </header>
        {notice && <div className={styles.notice}>{notice}</div>}
        <div className={styles.body}>{children}</div>
        <footer className={styles.foot}>{footer}</footer>
      </aside>
    </div>
  );
}

/** Footer content pinned to the left (e.g. Delete), with the rest on the right. */
export function FooterStart({ children }: { children: ReactNode }) {
  return <div className={styles.footStart}>{children}</div>;
}
