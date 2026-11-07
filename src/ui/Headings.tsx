import type { ReactNode } from 'react';
import styles from './Headings.module.css';

interface PageHeaderProps {
  title: ReactNode;
  kicker?: ReactNode;
  sub?: ReactNode;
  /** Buttons or a figure shown on the right. */
  actions?: ReactNode;
}

/** The big title at the top of each screen. */
export function PageHeader({ title, kicker, sub, actions }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageText}>
        {kicker && <div className={styles.kicker}>{kicker}</div>}
        <h1 className={styles.title}>{title}</h1>
        {sub && <p className={styles.sub}>{sub}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}

interface SectionHeadProps {
  title: ReactNode;
  aside?: ReactNode;
  sub?: ReactNode;
}

/** A section title with a thick rule underneath. */
export function SectionHead({ title, aside, sub }: SectionHeadProps) {
  return (
    <div className={styles.sectionHead}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {aside && <span className={styles.sectionAside}>{aside}</span>}
      {sub && <p className={styles.sectionSub}>{sub}</p>}
    </div>
  );
}
