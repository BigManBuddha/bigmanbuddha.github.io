import { useState, type FormEvent } from 'react';
import { useSlate } from '../../state/SlateProvider';
import { Button } from '../../ui/Button';
import { TextInput } from '../../ui/Field';
import { OnBadge, SettingsRow } from '../shared/layout';
import screen from '../shared/Screen.module.css';
import styles from './Settings.module.css';

/** Set, remove or engage the PIN lock. */
export function PinSettings() {
  const { state, act } = useSlate();
  const [setupOpen, setSetupOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const hasPin = !!state.pin;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const problem = await act.setPin(draft);
    setError(problem);
    if (!problem) { setDraft(''); setSetupOpen(false); }
  };

  return (
    <SettingsRow
      title="PIN lock"
      badge={hasPin && <OnBadge />}
      description="Asks for a PIN each time Slate opens. It's a privacy screen, not encryption; your device password is what protects the data."
    >
      {setupOpen && !hasPin && (
        <form className={screen.buttonRow} onSubmit={save}>
          <TextInput
            className={styles.pinInput}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setError(''); }}
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            placeholder="At least 4 digits"
            aria-label="New PIN"
            autoFocus
          />
          <Button type="submit" variant="primary">Save PIN</Button>
        </form>
      )}
      {error && <p className={screen.error} role="alert">{error}</p>}
      <div className={screen.buttonRow}>
        {hasPin
          ? <Button onClick={act.removePin}>Remove PIN lock</Button>
          : <Button onClick={() => { setSetupOpen((o) => !o); setDraft(''); setError(''); }}>{setupOpen ? 'Cancel' : 'Set a PIN lock'}</Button>}
        {hasPin && <Button onClick={act.lock}>Lock now</Button>}
      </div>
    </SettingsRow>
  );
}
