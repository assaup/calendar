import styles from './DashboardPage.module.scss';

export interface Segment {
  value: number;
  color: string;
  label: string;
}

// Простая кольцевая диаграмма на SVG.
export function Donut({
  segments,
  centerTop,
  centerBottom,
}: {
  segments: Segment[];
  centerTop: string;
  centerBottom: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const r = 54;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 140 140" className={styles.donut}>
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--app-surface-2)"
          strokeWidth="16"
        />
        {total > 0 &&
          segments.map((seg, i) => {
            if (seg.value === 0) return null;
            const len = (seg.value / total) * circ;
            const el = (
              <circle
                key={i}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 70 70)"
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
        <text x="70" y="66" className={styles.donutTop}>
          {centerTop}
        </text>
        <text x="70" y="86" className={styles.donutBottom}>
          {centerBottom}
        </text>
      </svg>
      <div className={styles.legend}>
        {segments.map((seg, i) => (
          <div key={i} className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ background: seg.color }}
            />
            <span className={styles.legendLabel}>{seg.label}</span>
            <span className={styles.legendValue}>{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
