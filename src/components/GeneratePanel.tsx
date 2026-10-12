import { useState } from 'react';
import { requestGeneration, sampleFallback, type GenerateResult } from '../lib/generated';

const MAX = 300;

interface Props {
  onImage: (prompt: string, image: string, model: string, latencyMs: number) => void;
}

export default function GeneratePanel({ onImage }: Props) {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [sampled, setSampled] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = prompt.trim();
    if (!p || busy) return;
    setBusy(true);
    setResult(null);
    setSampled(false);
    const r = await requestGeneration(p);
    if (r.ok) {
      onImage(p, r.image, r.model, r.latencyMs);
    } else {
      // Never surface a raw backend error: add a pre-generated sample card instead.
      const s = await sampleFallback();
      if (s) { onImage(s.prompt, s.image, 'sample (pre-generated)', 0); setSampled(true); }
    }
    setBusy(false);
    setResult(r);
  };

  return (
    <section className="gen" aria-busy={busy} aria-labelledby="gen-title" data-testid="gen-panel">
      <h2 id="gen-title" className="gen__title">Generate a card <span className="gen__tag">experimental · free models</span></h2>
      <p className="gen__hint">
        Sends your prompt to this site's server function, which tries Hugging Face and falls back to the free
        Pollinations.ai API. If live generation is busy, a pre-generated sample card is added instead.
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
        {result?.ok && <p className="gen__ok" data-testid="gen-ok">Added a new card · {result.latencyMs} ms · {result.model}</p>}
        {result && !result.ok && (
          <p className="gen__note" data-testid="gen-sampled">{sampled ? 'Live generation busy, showing samples.' : 'Live generation busy, try again in a moment.'}</p>
        )}
      </div>
    </section>
  );
}
