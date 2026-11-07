import type { ReactNode } from 'react';
import type { Tone } from '../domain/types';
import styles from './ActionRow.module.css';
import { Tag } from './Tag';

interface ActionRowProps {
  tone: Tone;
  label: string;
  name: string;
  detail?: string;
  /** Buttons on the right. */
  children?: ReactNode;
}

/** A row led by a status tag: [tag] name / detail [buttons]. */
export function ActionRow({ tone, label, name, detail, children }: ActionRowProps) {
  return (
    <div className={styles.row}>
      <span className={styles.tagCell}><Tag tone={tone}>{label}</Tag></span>
      <div className={styles.body}>
        <div className={styles.name}>{name}</div>
        {detail && <div className={styles.detail}>{detail}</div>}
      </div>
      {children && <div className={styles.buttons}>{children}</div>}
    </div>
  );
}
