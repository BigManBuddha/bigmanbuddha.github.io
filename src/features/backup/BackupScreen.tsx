import type { ChangeEvent } from 'react';
import { cx } from '../../lib/cx';
import { useSlate } from '../../state/SlateProvider';
import { Button } from '../../ui/Button';
import { PageHeader } from '../../ui/Headings';
import { OnBadge, SettingsRow } from '../shared/layout';
import screen from '../shared/Screen.module.css';

/** Auto-save, export/import, archiving and delete-all. */
export function BackupScreen() {
  const { state, derived, act, autosave, autosaveControls } = useSlate();

  const onImport = (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      input.value = ''; // allow picking the same file again
      act.importBackup(text);
    });
  };

  return (
    <div className={cx(screen.screen, screen.tight)} data-screen-label="Backup">
      <PageHeader title="Backup" sub="Your only copy lives in this browser. Export regularly, and always before clearing it." />

      <div>
        <SettingsRow
          title="Auto-save to a file"
          badge={autosave.linked && <OnBadge />}
          description="Link a file on your computer and every change is written to it automatically."
        >
          {!autosave.supported && (
            <p className={screen.body}>
              Writing straight to a file is only offered by Chrome and Edge on a computer. Everything else works the same here; just use <b>Export</b> below when you finish a session.
            </p>
          )}
          {autosave.supported && autosave.linked && (
            <>
              <div className={screen.statusLine}><span className={screen.statusDot} />{autosave.message}</div>
              <div className={screen.buttonRow}>
                {autosave.needsReconnect && <Button variant="primary" onClick={() => autosaveControls.reconnect()}>Reconnect</Button>}
                <Button onClick={() => autosaveControls.disconnect()}>Turn off auto-save</Button>
              </div>
            </>
          )}
          {autosave.supported && !autosave.linked && (
            <>
              <p className={screen.wash}>
                <b>Choose a folder on this computer</b>, not one inside Dropbox, OneDrive or iCloud Drive. Cloud-synced folders would copy client data off your device.
              </p>
              <Button variant="primary" onClick={() => autosaveControls.connect()}>Turn on auto-save</Button>
            </>
          )}
          {autosave.error && <p className={screen.error} role="alert">{autosave.error}</p>}
        </SettingsRow>

        <SettingsRow
          title="Export & restore"
          description="Export saves one backup file you can keep safe or move to another device. Import replaces what's here with a backup."
        >
          <div className={screen.buttonRow}>
            <Button variant="primary" onClick={act.exportBackup}>Export all my data</Button>
            <label className={screen.fileButton}>
              Import backup
              <input className={screen.fileInput} type="file" accept="application/json,.json" onChange={onImport} />
            </label>
            <Button onClick={act.seedSample}>Load sample data</Button>
          </div>
        </SettingsRow>

        {derived.staleCount > 0 && (
          <SettingsRow title="Old records">
            <p className={screen.body}>
              {derived.staleCount} discharged client(s) haven't been active for 6+ months. Archive them to keep only what you need.
            </p>
            <Button onClick={act.archiveOld}>Archive them</Button>
          </SettingsRow>
        )}

        <SettingsRow title="Delete all data" danger>
          <p className={screen.body}>
            Permanently removes every client, waitlist entry, template edit, setting and PIN from this device. A linked auto-save file is left untouched.
          </p>
          <Button variant="danger" onClick={act.openDeleteAll} disabled={state.clients.length === 0 && state.waitlist.length === 0 && !state.pin}>
            Delete everything
          </Button>
        </SettingsRow>
      </div>
    </div>
  );
}
