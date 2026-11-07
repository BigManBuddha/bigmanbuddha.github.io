import { forecastDecisions } from '../../domain/caseload';
import { fmtShort } from '../../domain/dates';
import { trimNum } from '../../domain/format';
import type { Tone } from '../../domain/types';
import { useSlate } from '../../state/SlateProvider';
import { PageHeader, SectionHead } from '../../ui/Headings';
import { columns } from '../shared/layout';
import screen from '../shared/Screen.module.css';
import styles from './Forecast.module.css';

const COLUMNS = columns('100px minmax(0, 3fr) 54px 54px 54px minmax(0, 2fr)');

const LEGEND: { tone: Tone; label: string }[] = [
  { tone: 'green', label: 'Under target' },
  { tone: 'amber', label: 'At target' },
  { tone: 'red', label: 'Over target' },
];

/** Capacity over the coming weeks, and when each frequency could next start. */
export function ForecastScreen() {
  const { derived } = useSlate();
  const { target, weeks, availability, forecast, forecastScale } = derived;
  const pct = (slots: number) => Math.min(100, (slots / forecastScale) * 100);

  return (
    <div className={screen.screen} data-screen-label="Forecast">
      <PageHeader
        title="Forecast"
        sub={<>The next {weeks} weeks. <b>Used</b> assumes everyone re-books unless marked likely to finish. <b>Safe</b> is what you can promise. <b>Best</b> is the most you could free up.</>}
        actions={(
          <div className={styles.target}>
            <div className={styles.targetLabel}>Weekly target</div>
            <div className={styles.targetValue}>{target}</div>
          </div>
        )}
      />

      <section>
        <SectionHead title="Can I take someone new?" />
        <div className={styles.availGrid}>
          {availability.map((a) => (
            <div key={a.freq} className={styles.availCell} data-tone={a.tone}>
              <div className={styles.availFreq}>{a.freq}</div>
              <div className={styles.availText}>{a.text}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHead
          title="Week by week"
          aside={(
            <span className={styles.legend}>
              {LEGEND.map((l) => (
                <span key={l.tone} className={styles.legendItem}><span className={styles.swatch} data-tone={l.tone} />{l.label}</span>
              ))}
              <span className={styles.legendItem}><span className={styles.tickSwatch} />Target</span>
            </span>
          )}
        />
        <div className={screen.table} style={{ ...COLUMNS, borderTop: 'none' }}>
          <div className={screen.thead}>
            <span>Week of</span><span>Slots used</span>
            <span className={screen.right}>Used</span><span className={screen.right}>Safe</span><span className={screen.right}>Best</span>
            <span>Decisions due</span>
          </div>
          {forecast.map((w) => (
            <div key={w.weekStart.getTime()} className={screen.row}>
              <span className={styles.week}>{fmtShort(w.weekStart)}</span>
              <div className={styles.track} aria-hidden="true">
                <div className={styles.fill} data-tone={w.tone} style={{ width: `${pct(w.used)}%` }} />
                <div className={styles.tick} style={{ left: `calc(${pct(target)}% - 1px)` }} />
              </div>
              <span className={styles.used} data-tone={w.tone}>{trimNum(w.used)}</span>
              <span className={styles.num}>{trimNum(w.safe)}</span>
              <span className={`${styles.num} ${screen.muted}`}>{trimNum(w.best)}</span>
              <span className={styles.decisions}>{forecastDecisions(w)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
