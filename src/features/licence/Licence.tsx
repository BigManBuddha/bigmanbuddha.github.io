/**
 * Everything licence-related on screen: the unlock panel, the Settings row,
 * and the trial band shown across the top of the app.
 */
import { useState, type FormEvent } from 'react';
import { PRICE_TEXT } from '../../domain/constants';
import { BUY_URL } from '../../services/licence';
import type { LicencePanelState } from '../../state/appState';
import { useSlate } from '../../state/SlateProvider';
import { Button } from '../../ui/Button';
import { TextInput } from '../../ui/Field';
import { FooterStart, Panel } from '../../ui/Panel';
import { SettingsRow } from '../shared/layout';
import screen from '../shared/Screen.module.css';
import styles from './Licence.module.css';

const goToCheckout = () => { window.location.href = BUY_URL; };

/** Unlock panel: buy, enter a key, or (once unlocked) view the key. */
export function LicencePanel({ panel }: { panel: LicencePanelState }) {
  const { state, act } = useSlate();

  if (panel.claiming) {
    return (
      <Panel title="Finishing your purchase" width={520} onClose={act.closePanel} footer={null}>
        <p className={screen.body}>Fetching your licence key. This only takes a moment.</p>
      </Panel>
    );
  }
  return state.licence === 'active' ? <UnlockedView panel={panel} /> : <UnlockView panel={panel} />;
}

function UnlockedView({ panel }: { panel: LicencePanelState }) {
  const { state, act } = useSlate();
  const [copied, setCopied] = useState(false);
  const key = panel.purchasedKey ?? state.licenceKey;
  const justBought = !!panel.purchasedKey;

  const copy = async () => { await act.copyText(key); setCopied(true); };

  return (
    <Panel
      title={justBought ? 'Thank you. Slate is unlocked.' : 'Licence'}
      width={560}
      onClose={act.closePanel}
      footer={(
        <>
          {copied && <FooterStart><span className={styles.copied}>Copied</span></FooterStart>}
          <Button variant="primary" onClick={act.closePanel}>{justBought ? 'Start using Slate' : 'Done'}</Button>
        </>
      )}
    >
      <p className={screen.body}>
        {justBought
          ? "Here's your licence key. We've also emailed it to you. Keep it somewhere safe: you'll need it if you move to a new device or clear this browser."
          : 'Slate is unlocked on this device.'}
      </p>
      {key && (
        <div className={styles.keyRow}>
          <div className={styles.key}>{key}</div>
          <Button onClick={copy}>Copy key</Button>
        </div>
      )}
      {justBought && state.seeded && (
        <div className={styles.block}>
          <p className={screen.wash}>The sample caseload is still here. Clear it when you're ready to add your own clients.</p>
          <Button onClick={act.deleteAll}>Clear sample data and start fresh</Button>
        </div>
      )}
    </Panel>
  );
}

function UnlockView({ panel }: { panel: LicencePanelState }) {
  const { act } = useSlate();
  const [entry, setEntry] = useState(panel.purchasedKey ?? '');
  const [error, setError] = useState(panel.error ?? '');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(await act.activateLicence(entry));
    setBusy(false);
  };

  return (
    <Panel
      title="Unlock Slate"
      width={560}
      notice={panel.reason}
      onClose={act.closePanel}
      footer={<Button onClick={act.closePanel}>Close</Button>}
    >
      <p className={screen.body}>
        You're exploring Slate with sample data. A licence lets you add your own clients and waitlist, and import backups.
      </p>
      <div className={styles.block}>
        <div className={styles.price}>{PRICE_TEXT}, paid once. One licence covers one device.</div>
        {BUY_URL && <Button variant="accent" size="lg" onClick={goToCheckout}>Buy Slate</Button>}
      </div>

      <form className={styles.block} onSubmit={submit}>
        <h3 className={styles.subhead}>Already bought it?</h3>
        <div className={styles.form}>
          <TextInput
            className={styles.input}
            value={entry}
            onChange={(e) => { setEntry(e.target.value); setError(''); }}
            placeholder="SLATE-XXXX-XXXX-XXXX-XXXX"
            aria-label="Licence key"
            autoComplete="off"
            spellCheck={false}
          />
          <Button type="submit" variant="primary" disabled={busy || !entry.trim()}>{busy ? 'Checking…' : 'Unlock'}</Button>
        </div>
        {error && <p className={screen.error} role="alert">{error}</p>}
        <p className={styles.hint}>Unlocking needs internet once. After that Slate works offline on this device.</p>
      </form>
    </Panel>
  );
}

/** Licence section on the Settings screen. */
export function LicenceSettings() {
  const { state, act } = useSlate();
  const active = state.licence === 'active';
  return (
    <SettingsRow
      title="Licence"
      description={active
        ? 'Slate is unlocked on this device.'
        : "You're using the trial. Everything works on the sample caseload; a licence lets you add your own."}
    >
      {active && state.licenceKey && <p className={styles.keyLine}>{state.licenceKey}</p>}
      <Button variant={active ? 'ghost' : 'primary'} onClick={act.openLicence}>
        {active ? 'View licence' : `Unlock Slate · ${PRICE_TEXT}`}
      </Button>
    </SettingsRow>
  );
}
