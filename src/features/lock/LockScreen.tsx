import { useState, type FormEvent } from 'react';
import { cx } from '../../lib/cx';
import { useSlate } from '../../state/SlateProvider';
import { Button } from '../../ui/Button';
import { Mark } from '../../ui/Mark';
import styles from '../shared/Overlay.module.css';

/** Shown instead of the app while a PIN is set and not yet entered. */
export function LockScreen() {
  const { act } = useSlate();
  const [entry, setEntry] = useState('');
  const [wrong, setWrong] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await act.unlock(entry);
    if (!ok) { setWrong(true); setEntry(''); }
  };

  return (
    <div className={cx(styles.centered, styles.lockPage)}>
      <Mark size={44} />
      <h1 className={styles.hero}>Locked.</h1>
      <p className={styles.heroLead}>Enter your PIN to open your caseload.</p>
      <form className={styles.pinForm} onSubmit={submit}>
        <input
          className={styles.pinInput}
          value={entry}
          onChange={(e) => { setEntry(e.target.value); setWrong(false); }}
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          placeholder="PIN"
          aria-label="PIN"
          autoFocus
        />
        <Button type="submit" size="lg" variant="primary">Unlock</Button>
      </form>
      {wrong && <p className={styles.error} role="alert">That PIN didn't match.</p>}
      <div>
        <Button variant="link" onClick={act.forgotPin}>Forgot your PIN?</Button>
      </div>
    </div>
  );
}
