import type { ReactNode } from 'react';
import type { Tone } from '../domain/types';
import styles from './Tag.module.css';

/** Solid status block, e.g. a red "Block ended" at the start of a row. */
export function Tag({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={styles.tag} data-tone={tone}>{children}</span>;
}
