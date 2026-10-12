import { memo, useEffect, useRef, useState } from 'react';
import type { Entry, Sample, Verdict } from '../types';
import Preview from './Preview';

interface Props {
  sample: Sample;
  entry: Entry | undefined;
  onRate: (id: string, rating: Verdict | null) => void;
  onNote: (id: string, note: string) => void;
  /** Only passed for imported cards. */
  onUpdate?: (id: string, patch: Partial<Sample>) => void;
  onRemove?: (id: string) => void;
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

function CardImpl({ sample, entry, onRate, onNote, onUpdate, onRemove }: Props) {
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
          <span className="visually-hidden">{sample.model}, seed {sample.seed ?? 'unknown'}. Prompt: </span>
          {sample.prompt || <em className="card__noprompt">No prompt recorded</em>}
        </p>

        <div className="rate" role="group" aria-label={`Rate ${sample.model} output, ${sample.source === 'local-import' ? `imported ${sample.fileName ?? ''}`.trim() : `seed ${sample.seed}`}`}>
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
        {sample.source === 'local-import' && onUpdate && onRemove && (
          <ImportMeta sample={sample} onUpdate={onUpdate} onRemove={onRemove} />
        )}
      </div>
    </article>
  );
}

function ImportMeta({ sample, onUpdate, onRemove }: { sample: Sample; onUpdate: NonNullable<Props['onUpdate']>; onRemove: NonNullable<Props['onRemove']> }) {
  const id = (k: string) => `imp-${k}-${sample.id}`;
  const num = (v: string): number | null => (/^\s*-?\d+\s*$/.test(v) ? Number(v) : null);
  const found = sample.metaFoundIn ?? [];
  return (
    <details className="imp" data-testid={`imp-meta-${sample.id}`}>
      <summary>Edit metadata <span className="imp__src">source: imported{sample.fileName ? ` · ${sample.fileName}` : ''}</span></summary>
      <p className="imp__hint">
        {found.length ? `Prefilled from file metadata (${found.join(', ')}). Check before trusting.` : 'No generation metadata found in this file; fields left blank.'}
      </p>
      <label htmlFor={id('prompt')}>Prompt</label>
      <textarea id={id('prompt')} rows={2} maxLength={2000} defaultValue={sample.prompt} onBlur={(e) => onUpdate(sample.id, { prompt: e.target.value.trim() })} />
      <label htmlFor={id('model')}>Model</label>
      <input id={id('model')} defaultValue={sample.model} maxLength={200} onBlur={(e) => onUpdate(sample.id, { model: e.target.value.trim() || sample.model })} />
      <div className="imp__row">
        <span>
          <label htmlFor={id('seed')}>Seed</label>
          <input id={id('seed')} inputMode="numeric" defaultValue={sample.seed ?? ''} onBlur={(e) => onUpdate(sample.id, { seed: num(e.target.value) })} />
        </span>
        <span>
          <label htmlFor={id('steps')}>Steps</label>
          <input id={id('steps')} inputMode="numeric" defaultValue={sample.steps ?? ''} onBlur={(e) => onUpdate(sample.id, { steps: num(e.target.value) })} />
        </span>
      </div>
      <label htmlFor={id('settings')}>Settings notes</label>
      <textarea id={id('settings')} rows={2} maxLength={500} placeholder="e.g. sampler, CFG, LoRA" defaultValue={sample.settingsNote ?? ''} onBlur={(e) => onUpdate(sample.id, { settingsNote: e.target.value })} />
      <button type="button" className="btn btn--ghost imp__remove" onClick={() => onRemove(sample.id)}>Remove imported image</button>
    </details>
  );
}

export default memo(CardImpl);
