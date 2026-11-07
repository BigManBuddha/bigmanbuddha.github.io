import { useState } from 'react';
import { ACTION_META } from '../../domain/constants';
import { CASELOAD_FILTERS, clientMetaLine, endsRelative, type FilterKey } from '../../domain/caseload';
import { fmtShort } from '../../domain/dates';
import { cx } from '../../lib/cx';
import { useSlate } from '../../state/SlateProvider';
import { Button } from '../../ui/Button';
import { PageHeader } from '../../ui/Headings';
import { Tag } from '../../ui/Tag';
import { columns } from '../shared/layout';
import screen from '../shared/Screen.module.css';
import { ClientButtons } from './ClientButtons';

const COLUMNS = columns('150px minmax(0, 1fr) 90px 150px auto');

/** Every client in one list. Click a row to edit. */
export function CaseloadScreen() {
  const { derived, act, today } = useSlate();
  const [filter, setFilter] = useState<FilterKey>('all');
  const active = CASELOAD_FILTERS.find((f) => f.key === filter) ?? CASELOAD_FILTERS[0];
  const rows = derived.computed.filter(active.test);

  return (
    <div className={cx(screen.screen, screen.tight)} data-screen-label="Caseload">
      <PageHeader
        title="Caseload"
        sub="Every client in one list. Click a row to edit."
        actions={<Button variant="primary" onClick={() => act.openClient(null)}>+ Add client</Button>}
      />

      <div className={screen.chips} role="group" aria-label="Filter">
        {CASELOAD_FILTERS.map((f) => (
          <button key={f.key} className={screen.chip} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}<span className={screen.chipCount}>{derived.computed.filter(f.test).length}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className={screen.empty}>
          No clients in this view. <button className={screen.inlineLink} onClick={() => act.openClient(null)}>Add one</button> to begin.
        </p>
      ) : (
        <div className={screen.table} style={COLUMNS}>
          <div className={screen.thead}>
            <span>Needs</span><span>Client</span><span>Status</span><span>Block ends</span><span />
          </div>
          {rows.map((c) => {
            const meta = ACTION_META[c.action];
            const rel = endsRelative(c.blockEnds, today);
            return (
              <div key={c.id} className={cx(screen.row, screen.clickable)} onClick={() => act.openClient(c)}>
                <span><Tag tone={meta.tone}>{meta.label}</Tag></span>
                <div className={screen.cellMain}>
                  <button className={screen.nameButton} onClick={(e) => { e.stopPropagation(); act.openClient(c); }}>{c.name}</button>
                  <div className={screen.meta}>{clientMetaLine(c)}</div>
                </div>
                <span className={screen.strong}>{c.status}</span>
                <span className={screen.strong}>
                  {c.blockEnds ? fmtShort(c.blockEnds) : '—'} <span className={screen.toneText} data-tone={rel.tone}>{rel.text}</span>
                </span>
                <div className={screen.cellEnd}><ClientButtons client={c} limit={1} /></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
