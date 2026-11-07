import { fmtShort, isoWeekNumber, mondayOf } from '../../domain/dates';
import { plural } from '../../domain/format';
import { waitDueText } from '../../domain/caseload';
import { useSlate } from '../../state/SlateProvider';
import { weekStats } from '../../state/derive';
import { Button } from '../../ui/Button';
import { PageHeader, SectionHead } from '../../ui/Headings';
import { Stat } from '../../ui/Stat';
import { ClientActionRow } from '../caseload/ClientButtons';
import screen from '../shared/Screen.module.css';
import styles from './Week.module.css';

/** "This week": the screen a user checks once a week. */
export function WeekScreen() {
  const { derived, act, today } = useSlate();
  const { urgent, soft, availability, waitDue } = derived;
  const isEmpty = derived.computed.length === 0;

  const title = isEmpty
    ? 'Welcome to Slate.'
    : urgent.length === 0
      ? 'Nothing urgent this week.'
      : <><span className={styles.mark}>{urgent.length}</span> {plural(urgent.length, 'client needs', 'clients need')} you this week.</>;

  return (
    <div className={screen.screen} data-screen-label="This week">
      <PageHeader
        kicker={`Week ${isoWeekNumber(today)} · w/c ${fmtShort(mondayOf(today))}`}
        title={title}
        actions={!isEmpty && (
          <>
            <Button variant="primary" onClick={act.startReview}>Start weekly review</Button>
            <Button onClick={() => act.openClient(null)}>+ Add client</Button>
          </>
        )}
      />

      {isEmpty ? (
        <div className={styles.intro}>
          <p className={styles.introText}>
            Add your clients once. Slate then keeps your capacity, forecast and follow-ups on the page, so a quick weekly look is all it takes.
          </p>
          <div className={screen.buttonRow}>
            <Button variant="primary" onClick={() => act.openClient(null)}>Add your first client</Button>
            <Button onClick={act.seedSample}>Explore with sample data</Button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.stats}>
            {weekStats(derived).map((s) => <Stat key={s.label} {...s} />)}
          </div>

          <div className={styles.columns}>
            <div className={styles.mainCol}>
              <section>
                <SectionHead title="Act now" aside={`${urgent.length} this week`} />
                {urgent.length > 0
                  ? urgent.map((c) => <ClientActionRow key={c.id} client={c} />)
                  : <p className={styles.allClear}>Nothing to decide this week.</p>}
              </section>

              {soft.length > 0 && (
                <section>
                  <SectionHead title="Coming up" aside={`${soft.length} to keep an eye on`} />
                  {soft.map((c) => <ClientActionRow key={c.id} client={c} />)}
                </section>
              )}
            </div>

            <div className={styles.sideCol}>
              <section>
                <SectionHead title="Can I take someone new?" sub="Earliest start you can safely promise." />
                {availability.map((a) => (
                  <div key={a.freq} className={styles.line}>
                    <span className={styles.lineLabel}>{a.freq}</span>
                    <span className={styles.lineValue} data-tone={a.tone}>{a.text}</span>
                  </div>
                ))}
              </section>

              {waitDue.length > 0 && (
                <section>
                  <SectionHead title="Waitlist check-ins" sub="Families not contacted for 2+ weeks." />
                  {waitDue.map(({ entry, days }) => (
                    <div key={entry.id} className={styles.line}>
                      <div>
                        <div className={styles.lineName}>{entry.name}</div>
                        <div className={styles.lineSub}>{waitDueText(days)}</div>
                      </div>
                      <Button size="sm" onClick={() => act.messageWaitlist(entry, 'waitlist-warm')}>Message</Button>
                    </div>
                  ))}
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
