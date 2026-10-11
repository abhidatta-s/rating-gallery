import { useEffect, useMemo, useRef, useState } from 'react';
import type { Entries, Filter, SortKey } from './types';
import { SAMPLES } from './data/samples';
import { useEntries } from './hooks/useEntries';
import { matchesFilter, sortSamples, summarize } from './lib/gallery';
import { buildExport, copyText, downloadText } from './lib/exportRatings';
import Card from './components/Card';
import SummaryBar from './components/SummaryBar';
import Toolbar from './components/Toolbar';

interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

export default function App() {
  const { entries, setRating, setNote, replaceAll, persistError } = useEntries();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<SortKey>('default');
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const resetBtn = useRef<HTMLButtonElement>(null);

  const summary = useMemo(() => summarize(SAMPLES, entries), [entries]);
  const visible = useMemo(
    () => sortSamples(SAMPLES.filter((s) => matchesFilter(filter, entries, s.id)), entries, sort),
    [filter, sort, entries],
  );

  const showToast = (message: string, undo?: () => void) => {
    window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, undo });
    toastTimer.current = window.setTimeout(() => setToast(null), undo ? 8000 : 2500);
  };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const anyData = summary.rated > 0 || summary.withNotes > 0;

  const doReset = () => {
    const snapshot: Entries = entries;
    replaceAll({});
    setConfirming(false);
    showToast('All ratings and notes cleared.', () => {
      replaceAll(snapshot);
      setToast(null);
    });
    resetBtn.current?.focus();
  };

  const onExport = () => {
    downloadText('rating-gallery-export.json', buildExport(SAMPLES, entries));
    showToast('Exported rating-gallery-export.json');
  };
  const onCopy = async () => {
    const ok = await copyText(buildExport(SAMPLES, entries));
    showToast(ok ? 'Ratings JSON copied to clipboard.' : 'Copy failed. Use Export instead.');
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header__title">
          <span className="logo" aria-hidden="true" />
          <div>
            <h1>Rating Gallery</h1>
            <p className="header__sub">
              Human-in-the-loop evaluation of AI-generated visual outputs. Rate each result, add a note, and export your judgments.
            </p>
          </div>
        </div>
        <div className="header__actions">
          <button type="button" className="btn" onClick={onCopy}>Copy JSON</button>
          <button type="button" className="btn btn--primary" onClick={onExport}>Export JSON</button>
          {confirming ? (
            <span className="confirm" role="alertdialog" aria-label="Confirm reset">
              <span>Clear all?</span>
              <button type="button" className="btn btn--danger" onClick={doReset} autoFocus>Yes, reset</button>
              <button type="button" className="btn" onClick={() => setConfirming(false)}>Cancel</button>
            </span>
          ) : (
            <button
              ref={resetBtn}
              type="button"
              className="btn btn--ghost"
              disabled={!anyData}
              onClick={() => setConfirming(true)}
            >
              Reset
            </button>
          )}
        </div>
      </header>

      <main>
        <SummaryBar s={summary} />
        {persistError && (
          <p className="banner" role="alert">
            Browser storage is unavailable, so ratings won't persist after you close this tab. Use Export to keep them.
          </p>
        )}
        <Toolbar filter={filter} sort={sort} summary={summary} onFilter={setFilter} onSort={setSort} />
        <p className="visually-hidden" role="status" aria-live="polite">
          Showing {visible.length} of {SAMPLES.length} results
        </p>

        {visible.length === 0 ? (
          <div className="empty" data-testid="empty">
            <p>No results match this filter.</p>
            <button type="button" className="btn" onClick={() => setFilter('all')}>Show all</button>
          </div>
        ) : (
          <ul className="grid" aria-label="Generated outputs">
            {visible.map((s) => (
              <li key={s.id}>
                <Card sample={s} entry={entries[s.id]} onRate={setRating} onNote={setNote} />
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="footer">
        <span>Sample outputs are generated locally from a seed. No images, no network, no tracking.</span>
        <span>Saved in this browser only.</span>
      </footer>

      {toast && (
        <div className="toast" role="status" aria-live="polite" key={toast.id}>
          <span>{toast.message}</span>
          {toast.undo && (
            <button type="button" className="toast__undo" onClick={toast.undo}>Undo</button>
          )}
        </div>
      )}
    </div>
  );
}
