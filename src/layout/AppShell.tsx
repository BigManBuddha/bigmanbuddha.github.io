import type { ReactNode } from 'react';
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
        <BackupNotice />
        <div className={styles.content}>{children}</div>
      </main>
      {layout === 'phone' && <PhoneTabs />}
    </div>
  );
}

/** Black band reminding the user their only copy lives in this browser. */
function BackupNotice() {
  const { state, act } = useSlate();
  if (state.noticeDismissed || state.clients.length === 0) return null;
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
