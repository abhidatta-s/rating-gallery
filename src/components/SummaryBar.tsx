import type { Summary } from '../lib/gallery';

export default function SummaryBar({ s }: { s: Summary }) {
  const pct = s.total === 0 ? 0 : (s.rated / s.total) * 100;
  return (
    <section className="summary" aria-label="Rating summary">
      <div className="stat">
        <span className="stat__value" data-testid="rated-count">{s.rated}<span className="stat__of">/{s.total}</span></span>
        <span className="stat__label">rated</span>
      </div>
      <div className="stat">
        <span className="stat__value stat__value--up" data-testid="liked-pct">{s.likedPct === null ? '–' : `${s.likedPct}%`}</span>
        <span className="stat__label">liked</span>
      </div>
      <div className="stat">
        <span className="stat__value">{s.disliked}</span>
        <span className="stat__label">disliked</span>
      </div>
      <div className="stat">
        <span className="stat__value">{s.withNotes}</span>
        <span className="stat__label">with notes</span>
      </div>
      <div className="summary__progress">
        <div
          className="progress"
          role="progressbar"
          aria-label="Rating progress"
          aria-valuemin={0}
          aria-valuemax={s.total}
          aria-valuenow={s.rated}
        >
          <div className="progress__fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </section>
  );
}
