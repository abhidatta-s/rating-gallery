import { useRef, useState } from 'react';
import type { Sample } from '../types';
import { fileToSample, isAccepted } from '../lib/imported';

interface Props {
  /** Returns false if the cards could not be persisted (quota). */
  onImported: (cards: Sample[]) => boolean;
}

export default function ImportPanel({ onImported }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const handle = async (list: FileList | File[] | null) => {
    const files = Array.from(list ?? []);
    if (!files.length || busy) return;
    const ok = files.filter(isAccepted);
    const rejected = files.length - ok.length;
    setBusy(true);
    const cards: Sample[] = [];
    let failed = 0;
    for (const f of ok) {
      try { cards.push(await fileToSample(f)); } catch { failed++; }
    }
    setBusy(false);
    const withMeta = cards.filter((c) => (c.metaFoundIn ?? []).length > 0).length;
    const saved = cards.length ? onImported(cards) : true;
    const parts = [`Imported ${cards.length} image${cards.length === 1 ? '' : 's'}`];
    if (cards.length) parts.push(`${withMeta} with readable metadata`);
    if (rejected) parts.push(`${rejected} skipped (not PNG/JPG/WebP)`);
    if (failed) parts.push(`${failed} could not be decoded`);
    if (!saved) parts.push('not saved: browser storage is full');
    setStatus(parts.join(' · ') + '.');
    if (input.current) input.current.value = '';
  };

  return (
    <section className="gen imp-panel" aria-labelledby="imp-title" data-testid="import-panel">
      <h2 id="imp-title" className="gen__title">Import images <span className="gen__tag">local · free · no upload</span></h2>
      <p className="gen__hint">
        Add PNG, JPG or WebP files exported from Draw Things. Files are read in this browser, downscaled to 768&nbsp;px and saved locally.
        Prompt, seed and steps are prefilled only if found in the PNG's metadata.
      </p>
      <div
        className={`drop${over ? ' is-over' : ''}`}
        data-testid="drop-zone"
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); void handle(e.dataTransfer.files); }}
      >
        <label htmlFor="imp-file" className="visually-hidden">Choose images to import</label>
        <input id="imp-file" ref={input} type="file" accept="image/png,image/jpeg,image/webp" multiple className="visually-hidden"
          onChange={(e) => void handle(e.target.files)} />
        <button type="button" className="btn" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Importing…' : 'Choose images…'}
        </button>
        <span className="drop__text">or drag and drop files here</span>
      </div>
      <p className="gen__ok" aria-live="polite" data-testid="import-status">{status}</p>
    </section>
  );
}
