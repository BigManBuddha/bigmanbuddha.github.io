import { daysSinceContact, waitlistMessageRole, waitlistTone } from '../../domain/caseload';
import { fmtShort, parseIso } from '../../domain/dates';
import { cx } from '../../lib/cx';
import { useSlate } from '../../state/SlateProvider';
import { Button } from '../../ui/Button';
import { PageHeader } from '../../ui/Headings';
import { Tag } from '../../ui/Tag';
import { columns } from '../shared/layout';
import screen from '../shared/Screen.module.css';

const COLUMNS = columns('150px minmax(0, 1fr) 120px 110px auto');

/** Families waiting for a space, coloured by how long since last contact. */
export function WaitlistScreen() {
  const { state, act, today } = useSlate();

  return (
    <div className={cx(screen.screen, screen.tight)} data-screen-label="Waitlist">
      <PageHeader
        title="Waitlist"
        sub="Families waiting for a space. Yellow after 14 days without contact, red after 21."
        actions={<Button variant="primary" onClick={() => act.openWaitlist(null)}>+ Add to waitlist</Button>}
      />

      {state.waitlist.length === 0 ? (
        <p className={screen.empty}>No one waiting. When the forecast shows a free slot, add prospective clients here.</p>
      ) : (
        <div className={screen.table} style={COLUMNS}>
          <div className={screen.thead}>
            <span>Since contact</span><span>Name</span><span>Needs</span><span>Added</span><span />
          </div>
          {state.waitlist.map((w) => {
            const days = daysSinceContact(w, today);
            return (
              <div key={w.id} className={screen.row}>
                <span><Tag tone={waitlistTone(days)}>{days === null ? 'Never' : `${days} days`}</Tag></span>
                <div className={screen.cellMain}>
                  <div className={screen.name}>{w.name}</div>
                  {w.notes && <div className={screen.meta}>{w.notes}</div>}
                </div>
                <span className={screen.strong}>{w.need}</span>
                <span className={screen.muted}>{fmtShort(parseIso(w.added))}</span>
                <div className={screen.cellEnd}>
                  <Button size="sm" variant="primary" onClick={() => act.messageWaitlist(w, waitlistMessageRole(days))}>Message</Button>
                  <Button size="sm" onClick={() => act.openWaitlist(w)}>Edit</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
