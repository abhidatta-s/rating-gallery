import { useState } from 'react';
import { requestGeneration, type GenerateResult } from '../lib/generated';

const MAX = 300;

interface Props {
  onImage: (prompt: string, image: string, model: string, latencyMs: number) => void;
}

export default function GeneratePanel({ onImage }: Props) {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = prompt.trim();
    if (!p || busy) return;
    setBusy(true);
    setResult(null);
    const r = await requestGeneration(p);
    setBusy(false);
    setResult(r);
    if (r.ok) onImage(p, r.image, r.model, r.latencyMs);
  };

  return (
    <section className="gen" aria-busy={busy} aria-labelledby="gen-title" data-testid="gen-panel">
      <h2 id="gen-title" className="gen__title">Generate a card <span className="gen__tag">experimental · Hugging Face</span></h2>
      <p className="gen__hint">
        Sends your prompt to this site's server function, which calls Hugging Face with a server-side token.
        Free accounts may need credits; failures are shown as-is.
      </p>
      <form className="gen__form" onSubmit={submit}>
        <label htmlFor="gen-prompt" className="visually-hidden">Prompt</label>
        <input
          id="gen-prompt"
          className="gen__input"
          value={prompt}
          maxLength={MAX}
          placeholder="e.g. matte white ceramic mug on a light oak table"
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button type="submit" className="btn btn--primary" disabled={busy || !prompt.trim()}>
          {busy ? 'Generating…' : 'Generate'}
        </button>
      </form>
      <div aria-live="polite" data-testid="gen-status">
        {result?.ok && <p className="gen__ok">Added a new card · {result.latencyMs} ms · {result.model}</p>}
        {result && !result.ok && (
          <div className="gen__fail" role="alert">
            <div className="gen__placeholder" aria-hidden="true">No image</div>
            <p>
              <strong>Generation failed</strong> · status {result.status} · {result.error}
              {result.latencyMs !== null && <> · {result.latencyMs} ms</>}
            </p>
            <p className="gen__detail">{result.detail}</p>
          </div>
        )}
      </div>
    </section>
  );
}
