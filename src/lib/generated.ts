import type { Sample } from '../types';
import samples from './samples.json';

export const GENERATED_KEY = 'rating-gallery:generated:v1';
/** Data URLs larger than this stay in memory only (lost on reload). */
export const MAX_PERSIST_CHARS = 400_000;

export type GenerateResult =
  | { ok: true; image: string; latencyMs: number; model: string }
  | { ok: false; error: string; status: number; detail: string; latencyMs: number | null };

export async function requestGeneration(prompt: string): Promise<GenerateResult> {
  const started = performance.now();
  let res: Response;
  try {
    res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
  } catch (e) {
    return { ok: false, error: 'network_error', status: 0, detail: e instanceof Error ? e.message : 'Request failed', latencyMs: null };
  }
  const body: unknown = await res.json().catch(() => null);
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  if (res.ok && typeof b.image === 'string' && b.image.startsWith('data:image/')) {
    return {
      ok: true,
      image: b.image,
      latencyMs: typeof b.latencyMs === 'number' ? b.latencyMs : Math.round(performance.now() - started),
      model: typeof b.model === 'string' ? b.model : 'unknown',
    };
  }
  return {
    ok: false,
    error: typeof b.error === 'string' ? b.error : 'unexpected_response',
    status: typeof b.status === 'number' ? b.status : res.status,
    detail: typeof b.detail === 'string' ? b.detail : `HTTP ${res.status} (is /api available? use \`vercel dev\` locally)`,
    latencyMs: typeof b.latencyMs === 'number' ? b.latencyMs : null,
  };
}

function isGenerated(v: unknown): v is Sample {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return typeof s.id === 'string' && typeof s.prompt === 'string' && typeof s.model === 'string'
    && typeof s.imageUrl === 'string' && s.imageUrl.startsWith('data:image/');
}

export function loadGenerated(): Sample[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(GENERATED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isGenerated) : [];
  } catch {
    return [];
  }
}

/** Persists only cards whose image is small enough; returns how many were saved. */
export function saveGenerated(list: Sample[]): number {
  const small = list.filter((s) => (s.imageUrl?.length ?? 0) <= MAX_PERSIST_CHARS);
  try {
    window.localStorage.setItem(GENERATED_KEY, JSON.stringify(small));
    return small.length;
  } catch {
    return 0;
  }
}

/** Pre-generated images shown when live generation is unavailable (never a raw error). */
export async function sampleFallback(): Promise<{ image: string; prompt: string } | null> {
  const s = samples[Math.floor(Math.random() * samples.length)]!;
  try {
    const blob = await (await fetch(s.file)).blob();
    const image = await new Promise<string>((ok, bad) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = bad; r.readAsDataURL(blob); });
    return { image, prompt: s.prompt };
  } catch {
    return null;
  }
}

/** Second chance from the visitor's browser: Pollinations.ai is free, keyless and CORS-enabled. */
export async function browserGenerate(prompt: string): Promise<{ image: string; latencyMs: number } | null> {
  const started = performance.now();
  for (let attempt = 0; attempt < 2; attempt++) {
    const seed = Math.floor(Math.random() * 1e9);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&model=flux&nologo=true&referrer=ratinggallery.vercel.app&seed=${seed}`;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 25_000);
    try {
      const res = await fetch(url, { signal: ctl.signal });
      if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) continue;
      const blob = await res.blob();
      const image = await new Promise<string>((ok, bad) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = bad; r.readAsDataURL(blob); });
      return { image, latencyMs: Math.round(performance.now() - started) };
    } catch { /* retry */ } finally { clearTimeout(timer); }
  }
  return null;
}
