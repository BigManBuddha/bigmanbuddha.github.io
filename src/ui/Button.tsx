import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../lib/cx';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'accent' | 'inverse' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = black fill · ghost = black outline · danger = red outline · accent = yellow · inverse = on black · link = underlined text */
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = 'ghost', size = 'md', className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, styles[size], variant !== 'ghost' && styles[variant], className)}
      {...rest}
    />
  );
}
