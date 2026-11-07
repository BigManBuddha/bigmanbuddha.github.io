import { REVIEW_STEP_COUNT, ROLE } from '../../domain/constants';
import { waitDueText } from '../../domain/caseload';
import { cx } from '../../lib/cx';
import { useEscape } from '../../lib/useEscape';
import { reviewStats } from '../../state/derive';
import { useSlate } from '../../state/SlateProvider';
import { ActionRow } from '../../ui/ActionRow';
import { Button } from '../../ui/Button';
import { Stat } from '../../ui/Stat';
import { ClientActionRow } from '../caseload/ClientButtons';
import styles from '../shared/Overlay.module.css';

const STEPS = [
  { title: 'Clear your flags', lead: 'These clients need a decision this week. Handle each one: invite back, chase, or release the slot.' },
  { title: 'Check your capacity', lead: "Where you stand this week. If used is over target, some finishing clients haven't confirmed yet. That's expected." },
  { title: 'Offer freed slots', lead: "Anyone on your waitlist who's due a warm check-in. Offer genuinely freed slots first, and keep the rest warm." },
  { title: 'Done for the week', lead: 'Your caseload now lives on the page, not in your head. Close the tab; see you next week.' },
];

/** The guided weekly routine: four short full-screen steps. */
export function WeeklyReview({ step }: { step: number }) {
  const { state, act } = useSlate();
  // Escape closes the review, unless a message panel is open on top of it.
  useEscape(() => { if (!state.panel) act.closeReview(); });
  const { title, lead } = STEPS[step];
  const isLast = step >= REVIEW_STEP_COUNT - 1;

  return (
    <div className={cx(styles.overlay, styles.review)} role="dialog" aria-modal="true" aria-label="Weekly review">
      <div className={styles.bar}>
        <div className={styles.barRow}>
          <div className={styles.barLabel}>Weekly review · Step {step + 1} of {REVIEW_STEP_COUNT}</div>
          <Button variant="link" onClick={act.closeReview}>Exit review</Button>
        </div>
        <div className={styles.progress}>
          {STEPS.map((_, i) => <div key={i} className={styles.progressStep} data-done={i <= step || undefined} />)}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.inner}>
          <div>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.lead}>{lead}</p>
          </div>
          <StepBody step={step} />
        </div>
      </div>

      <div className={styles.footer}>
        <Button size="lg" className={step === 0 ? styles.hidden : undefined} onClick={act.reviewBack}>Back</Button>
        <Button size="lg" variant="primary" onClick={act.reviewNext}>{isLast ? 'Finish' : 'Next'}</Button>
      </div>
    </div>
  );
}

/** The content of one review step. */
function StepBody({ step }: { step: number }) {
  const { derived, act } = useSlate();
  if (step === 0) {
    return derived.urgent.length > 0
      ? <div className={styles.list}>{derived.urgent.map((c) => <ClientActionRow key={c.id} client={c} />)}</div>
      : <p className={styles.note}>Nothing urgent. No blocks ending or chases due.</p>;
  }
  if (step === 1) {
    return <div className={styles.stats}>{reviewStats(derived).map((s) => <Stat key={s.label} {...s} />)}</div>;
  }
  if (step === 2) {
    return derived.waitDue.length > 0
      ? (
        <div className={styles.list}>
          {derived.waitDue.map(({ entry, days }) => (
            <ActionRow key={entry.id} tone="amber" label="Due" name={entry.name} detail={waitDueText(days)}>
              <Button size="sm" variant="primary" onClick={() => act.messageWaitlist(entry, ROLE.WAIT_WARM)}>Message</Button>
            </ActionRow>
          ))}
        </div>
      )
      : <p className={styles.note}>No waitlist check-ins overdue. Everyone's warm.</p>;
  }
  const remaining = derived.urgent.length;
  return (
    <p className={styles.note}>
      That's the weekly review complete. {remaining > 0 ? `${remaining} item(s) still need action when you have a moment.` : "Everything's handled."}
    </p>
  );
}
