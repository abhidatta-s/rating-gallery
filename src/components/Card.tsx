import { memo, useEffect, useRef, useState } from 'react';
import type { Entry, Sample, Verdict } from '../types';
import Preview from './Preview';

interface Props {
  sample: Sample;
  entry: Entry | undefined;
  onRate: (id: string, rating: Verdict | null) => void;
  onNote: (id: string, note: string) => void;
}

const DEBOUNCE_MS = 400;

function ThumbIcon({ down }: { down?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={down ? { transform: 'rotate(180deg)' } : undefined}>
      <path d="M7 10v11H3V10h4Z" />
      <path d="M7 10l4-8a2.5 2.5 0 0 1 2.5 2.7L13 9h6.2a2 2 0 0 1 2 2.3l-1.3 8a2 2 0 0 1-2 1.7H7" />
    </svg>
  );
}

function CardImpl({ sample, entry, onRate, onNote }: Props) {
  const rating = entry?.rating ?? null;
  const note = entry?.note ?? '';
  const [draft, setDraft] = useState(note);
  const [saved, setSaved] = useState(false);
  const committed = useRef(note);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef({ draft: note, onNote });
  latest.current = { draft, onNote };

  // Sync when the store changes from outside (reset / undo).
  useEffect(() => {
    if (note !== committed.current) {
      window.clearTimeout(timer.current);
      committed.current = note;
      setDraft(note);
    }
  }, [note]);

  const commit = (value: string) => {
    window.clearTimeout(timer.current);
    if (value !== committed.current) {
      committed.current = value;
      onNote(sample.id, value);
      setSaved(true);
    }
  };

  // Flush any pending note if the card unmounts (e.g. filtered out).
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      const { draft: d, onNote: fn } = latest.current;
      if (d !== committed.current) {
        committed.current = d;
        fn(sample.id, d);
      }
    },
    [sample.id],
  );

  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 1500);
    return () => window.clearTimeout(t);
  }, [saved]);

  const titleId = `title-${sample.id}`;
  const noteId = `note-${sample.id}`;

  return (
    <article
      className={`card${rating ? ` card--${rating}` : ''}`}
      aria-labelledby={titleId}
      data-testid={`card-${sample.id}`}
      data-rating={rating ?? 'none'}
    >
      <Preview sample={sample} />
      <div className="card__body">
        <p id={titleId} className="card__prompt">
          <span className="visually-hidden">{sample.model}, seed {sample.seed}. Prompt: </span>
          {sample.prompt}
        </p>

        <div className="rate" role="group" aria-label={`Rate ${sample.model} output, seed ${sample.seed}`}>
          <button
            type="button"
            className="rate__btn rate__btn--up"
            aria-pressed={rating === 'up'}
            onClick={() => onRate(sample.id, rating === 'up' ? null : 'up')}
          >
            <ThumbIcon /> <span>Good</span>
          </button>
          <button
            type="button"
            className="rate__btn rate__btn--down"
            aria-pressed={rating === 'down'}
            onClick={() => onRate(sample.id, rating === 'down' ? null : 'down')}
          >
            <ThumbIcon down /> <span>Poor</span>
          </button>
        </div>

        <div className="note">
          <label htmlFor={noteId} className="note__label">
            Note <span className="note__opt">(optional)</span>
            <span className={`note__saved${saved ? ' is-on' : ''}`} aria-live="polite">{saved ? 'Saved' : ''}</span>
          </label>
          <textarea
            id={noteId}
            rows={2}
            maxLength={500}
            placeholder="What worked or didn't?"
            value={draft}
            onChange={(e) => {
              const v = e.target.value;
              setDraft(v);
              window.clearTimeout(timer.current);
              timer.current = window.setTimeout(() => commit(v), DEBOUNCE_MS);
            }}
            onBlur={() => commit(draft)}
          />
        </div>
      </div>
    </article>
  );
}

export default memo(CardImpl);
