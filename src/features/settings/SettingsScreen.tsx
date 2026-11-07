import type { ChangeEvent } from 'react';
import type { Settings } from '../../domain/types';
import { useSlate } from '../../state/SlateProvider';
import { Button } from '../../ui/Button';
import { Field, FieldGrid, TextInput } from '../../ui/Field';
import { PageHeader } from '../../ui/Headings';
import { cx } from '../../lib/cx';
import { SettingsRow } from '../shared/layout';
import screen from '../shared/Screen.module.css';
import { LicenceSettings } from '../licence/Licence';
import { PinSettings } from './PinSettings';
import styles from './Settings.module.css';

const PRIVACY_POINTS = [
  'You are the data controller. Because the records stay with you, keeping this device secure (a password, a locked screen, no shared logins) is what keeps client data safe.',
  'There is no copy anywhere else. If you clear your browser data, lose the device, or delete everything here, the records are gone. Keep a backup.',
  "Each person's data is separate. Another device or browser profile has its own records. Nothing is shared or synced.",
  'Record as little as you need. Initials or an ID work as well as full names, and keep exposure low if a device is lost.',
];

/** Capacity rules, frequencies, PIN lock and privacy notes. */
export function SettingsScreen() {
  const { state, act } = useSlate();
  const { settings } = state;
  const bind = (key: 'yourName' | 'target' | 'weeks' | 'lead') => ({
    value: String(settings[key]),
    onChange: (e: ChangeEvent<HTMLInputElement>) => act.updateSettings({ [key]: e.target.value } as Partial<Settings>),
  });

  return (
    <div className={cx(screen.screen, screen.tight)} data-screen-label="Settings">
      <PageHeader title="Settings" sub="Set your capacity rules once. Every other screen works from them." />

      <div>
        <SettingsRow title="Your practice" description="Your name signs off messages. Target is how many weekly slots you want filled.">
          <div className={screen.stretch}>
            <FieldGrid>
              <Field label="Your name"><TextInput {...bind('yourName')} placeholder="For message sign-offs" /></Field>
              <Field label="Target slots per week"><TextInput {...bind('target')} type="number" inputMode="decimal" min={0} /></Field>
              <Field label="Weeks to forecast (1–26)"><TextInput {...bind('weeks')} type="number" inputMode="numeric" min={1} max={26} /></Field>
              <Field label="Heads-up before a block ends (weeks)"><TextInput {...bind('lead')} type="number" inputMode="numeric" min={0} /></Field>
            </FieldGrid>
          </div>
        </SettingsRow>

        <SettingsRow
          title="Frequencies"
          description="Load is the share of one weekly slot a client uses (weekly = 1, fortnightly = 0.5). Gap is weeks between sessions. A frequency in use can't be removed."
        >
          <div className={cx(screen.stretch, styles.freqList)}>
            <div className={styles.freqHead}><span>Name</span><span>Load</span><span>Gap (wks)</span><span /></div>
            {settings.frequencies.map((f, i) => (
              <div key={i} className={styles.freqRow}>
                <TextInput className={styles.freqInput} value={f.name} onChange={(e) => act.editFrequency(i, 'name', e.target.value)} aria-label="Frequency name" />
                <TextInput className={styles.freqInput} value={String(f.load)} onChange={(e) => act.editFrequency(i, 'load', e.target.value)} type="number" step="0.01" inputMode="decimal" aria-label="Load" />
                <TextInput className={styles.freqInput} value={String(f.gap)} onChange={(e) => act.editFrequency(i, 'gap', e.target.value)} type="number" step="0.5" inputMode="decimal" aria-label="Gap in weeks" />
                <button className={styles.remove} onClick={() => act.removeFrequency(i)} title={`Remove ${f.name}`} aria-label={`Remove ${f.name}`}>×</button>
              </div>
            ))}
          </div>
          <Button size="sm" onClick={act.addFrequency}>+ Add frequency</Button>
        </SettingsRow>

        <LicenceSettings />

        <PinSettings />

        <SettingsRow title="Privacy" description="Your caseload never leaves this device. No account, no cloud. The only thing Slate ever sends is your licence key and a random device ID, once, when you unlock it.">
          <div className={styles.points}>
            {PRIVACY_POINTS.map((text, i) => (
              <div key={i} className={styles.point}>
                <span className={styles.pointNum}>{i + 1}</span>
                <p className={styles.pointText}>{text}</p>
              </div>
            ))}
          </div>
        </SettingsRow>
      </div>
    </div>
  );
}
