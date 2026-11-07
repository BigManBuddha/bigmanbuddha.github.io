import { useSlate } from '../../state/SlateProvider';
import { Button } from '../../ui/Button';
import { Panel } from '../../ui/Panel';
import screen from '../shared/Screen.module.css';

/** Final check before wiping all data on this device. */
export function DeleteAllPanel() {
  const { act } = useSlate();
  return (
    <Panel
      title="Delete everything?"
      width={480}
      danger
      onClose={act.closePanel}
      footer={(
        <>
          <Button onClick={act.closePanel}>Cancel</Button>
          <Button variant="danger" onClick={act.deleteAll}>Delete everything</Button>
        </>
      )}
    >
      <p className={screen.body}>This permanently removes all clients, waitlist entries, settings and your PIN from this device. It can't be undone.</p>
      <p className={screen.body}>If auto-save is on, the save file is <b>unlinked and left untouched</b>, so you can import it later.</p>
    </Panel>
  );
}
