import type { CSSProperties, ReactNode } from 'react';
import styles from './Screen.module.css';

/** Grid column template for a table, passed to CSS as --cols. */
export function columns(template: string): CSSProperties {
  return { '--cols': template } as CSSProperties;
}

interface SettingsRowProps {
  title: ReactNode;
  description?: ReactNode;
  /** Shown next to the title, e.g. an "ON" badge. */
  badge?: ReactNode;
  danger?: boolean;
  children: ReactNode;
}

/** A settings section: title and explanation on the left, controls on the right. */
export function SettingsRow({ title, description, badge, danger, children }: SettingsRowProps) {
  return (
    <section className={styles.settingsRow} data-danger={danger || undefined}>
      <div className={styles.settingsAside}>
        <h2 className={styles.settingsTitle}>{title}{badge}</h2>
        {description && <p className={styles.settingsDesc}>{description}</p>}
      </div>
      <div className={styles.settingsMain}>{children}</div>
    </section>
  );
}

export function OnBadge() {
  return <span className={styles.on}>ON</span>;
}
