import { cx } from '../../lib/cx';
import { useSlate } from '../../state/SlateProvider';
import { Button } from '../../ui/Button';
import { Mark } from '../../ui/Mark';
import styles from '../shared/Overlay.module.css';

const STEPS = [
  { title: 'Add your clients', text: 'Frequency, block start and length. Slate works out sessions left, when each block ends, and how much of a slot each client uses.' },
  { title: 'Run the weekly review', text: "A short guided routine shows who's finishing, who to chase and which slots have freed, with one click to act." },
  { title: 'It stays on your device', text: 'No account, no cloud, nothing sent anywhere. Back up any time from the Backup screen.' },
];

/** First-run welcome. */
export function Onboarding() {
  const { state, act } = useSlate();
  const trial = state.licence === 'trial';
  const finishThen = (next?: () => void) => () => { act.finishOnboarding(); next?.(); };

  return (
    <div className={cx(styles.overlay, styles.onboarding)} role="dialog" aria-modal="true" aria-label="Welcome">
      <div className={styles.centered}>
        <Mark size={44} />
        <div>
          <h1 className={styles.hero}>Welcome to Slate.</h1>
          <p className={styles.heroLead}>
            Get your caseload out of your head and onto one page. Add your clients once; after that, a few minutes a week tells you what needs deciding and whether you can take someone new.
          </p>
        </div>
        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={s.title} className={styles.step}>
              <div className={styles.stepNum}>{String(i + 1).padStart(2, '0')}</div>
              <div className={styles.stepTitle}>{s.title}</div>
              <p className={styles.stepText}>{s.text}</p>
            </div>
          ))}
        </div>
        {trial ? (
          <div className={styles.actions}>
            <Button size="lg" variant="primary" onClick={finishThen(act.seedSample)}>Explore with sample data</Button>
            <Button size="lg" onClick={finishThen(act.openLicence)}>Buy or enter a licence key</Button>
          </div>
        ) : (
          <div className={styles.actions}>
            <Button size="lg" variant="primary" onClick={finishThen(() => act.openClient(null))}>Add my first client</Button>
            <Button size="lg" onClick={finishThen(act.seedSample)}>Explore with sample data</Button>
            <Button size="lg" variant="link" onClick={finishThen()}>I'll look around</Button>
          </div>
        )}
      </div>
    </div>
  );
}
