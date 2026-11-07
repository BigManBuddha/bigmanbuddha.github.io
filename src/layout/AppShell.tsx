import { useEffect, useState, type ReactNode } from 'react';
import { PRICE_TEXT } from '../domain/constants';
import { watchForUpdates } from '../services/updates';
import { useSlate } from '../state/SlateProvider';
import { Button } from '../ui/Button';
import { useSidebarPref, useViewportWidth } from './hooks';
import { layoutFor } from './layout';
import { PhoneTabs, PhoneTopBar } from './PhoneNav';
import { Rail } from './Rail';
import styles from './Shell.module.css';
import { Sidebar } from './Sidebar';

/** Page frame: navigation for the current screen size, the backup reminder, then the screen. */
export function AppShell({ children }: { children: ReactNode }) {
  const width = useViewportWidth();
  const [pref, setPref] = useSidebarPref();
  const layout = layoutFor(width, pref);

  return (
    <div className={styles.shell}>
      {layout === 'full' && <Sidebar onHide={() => setPref('rail')} />}
      {layout === 'rail' && <Rail onShow={() => setPref('full')} />}
      <main className={styles.main}>
        {layout === 'phone' && <PhoneTopBar />}
        <UpdateNotice />
        <TrialNotice />
        <BackupNotice />
        <div className={styles.content}>{children}</div>
      </main>
      {layout === 'phone' && <PhoneTabs />}
    </div>
  );
}

/** Shown when a newer release is live. Reloading is safe: all data is already saved. */
function UpdateNotice() {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => (import.meta.env.PROD ? watchForUpdates(__APP_VERSION__, setVersion) : undefined), []);
  if (!version) return null;
  return (
    <div className={styles.notice} role="status">
      <p className={styles.noticeText}>
        <b>Slate {version} is ready.</b> Reload to update. Your data stays exactly as it is.
      </p>
      <div className={styles.noticeButtons}>
        <Button variant="accent" size="sm" onClick={() => window.location.reload()}>Reload now</Button>
        <Button variant="inverse" size="sm" onClick={() => setVersion(null)}>Later</Button>
      </div>
    </div>
  );
}

/** Shown until Slate is unlocked. */
function TrialNotice() {
  const { state, act } = useSlate();
  if (state.licence !== 'trial') return null;
  return (
    <div className={styles.notice} role="status">
      <p className={styles.noticeText}>
        You're exploring Slate with sample data. <b>Unlock it for {PRICE_TEXT}</b> to add your own clients.
      </p>
      <div className={styles.noticeButtons}>
        <Button variant="accent" size="sm" onClick={act.openLicence}>Unlock Slate</Button>
      </div>
    </div>
  );
}

/** Black band reminding the user their only copy lives in this browser. */
function BackupNotice() {
  const { state, act } = useSlate();
  if (state.noticeDismissed || state.clients.length === 0 || state.licence !== 'active') return null;
  return (
    <div className={styles.notice} role="status">
      <p className={styles.noticeText}>
        Your caseload is saved only in this browser. <b>Export a backup regularly</b>, and always before clearing your browser.
      </p>
      <div className={styles.noticeButtons}>
        <Button variant="accent" size="sm" onClick={act.exportBackup}>Export backup</Button>
        <Button variant="inverse" size="sm" onClick={act.dismissNotice}>Dismiss</Button>
      </div>
    </div>
  );
}
