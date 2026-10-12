/**
 * POST /api/generate  { "prompt": string }
 *
 * Vercel Function (Node.js runtime, Web-standard fetch handler).
 * 1) Hugging Face Inference router (server-side HF_TOKEN, never logged or returned).
 * 2) If HF fails (e.g. 402: the free account has no inference credits), falls back to
 *    Pollinations.ai, a free keyless text-to-image API (flux), with one retry.
 * The client shows pre-generated samples if both fail, so visitors always see images.
 *
 * Success: 200 { image: "data:<type>;base64,...", latencyMs, model }
 * Failure: <status> { error, status, detail, latencyMs, model }
 *
 * NOT included: rate limiting, auth on this endpoint, monitoring.
 * Note: HF's pricing page (checked 2026-10-12) lists no included monthly
 * credits for free accounts, so calls may return 401/402 without credits.
 */

// Minimal typing so tsc passes without @types/node (no new deps).
declare const process: { env: Record<string, string | undefined> };

export const MAX_PROMPT = 300;
const HF_TIMEOUT_MS = 15_000;
const POLL_TIMEOUT_MS = 20_000;
const POLL_ATTEMPTS = 2;
const MAX_IMAGE_BYTES = 3_000_000; // keep under Vercel's 4.5 MB response cap after base64
const DEFAULT_MODEL = 'stabilityai/stable-diffusion-3-medium-diffusers';
const MODEL_RE = /^[\w.-]+\/[\w.-]+$/;

export interface GenerateError {
  error: string;
  status: number;
  detail: string;
  latencyMs: number | null;
  model: string;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function fail(error: string, status: number, detail: string, model: string, latencyMs: number | null = null): Response {
  const body: GenerateError = { error, status, detail: detail.slice(0, 300), latencyMs, model };
  return json(body, status);
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

export async function handle(request: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const envModel = process.env.HF_IMAGE_MODEL?.trim();
  const model = envModel && MODEL_RE.test(envModel) ? envModel : DEFAULT_MODEL;

  if (request.method !== 'POST') {
    const r = fail('method_not_allowed', 405, 'Use POST.', model);
    r.headers.set('allow', 'POST');
    return r;
  }

  let prompt: unknown;
  try {
    prompt = ((await request.json()) as { prompt?: unknown } | null)?.prompt;
  } catch {
    return fail('bad_request', 400, 'Body must be JSON: {"prompt": "..."}', model);
  }
  if (typeof prompt !== 'string' || prompt.trim().length < 1 || prompt.length > MAX_PROMPT) {
    return fail('bad_request', 400, `prompt must be a string of 1-${MAX_PROMPT} characters.`, model);
  }

  const p = prompt.trim();
  const started = Date.now();
  const errors: string[] = [];

  // 1) Hugging Face (only if a token is configured). Fails fast on 401/402 (no credits).
  const token = process.env.HF_TOKEN;
  if (token) {
    const r = await tryFetchImage(fetchImpl, `https://router.huggingface.co/hf-inference/models/${model}`, HF_TIMEOUT_MS, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'image/*' },
      body: JSON.stringify({ inputs: p }),
    });
    if ('image' in r) return json({ image: r.image, latencyMs: Date.now() - started, model, provider: 'huggingface' }, 200);
    errors.push(`HF: ${r.error}`);
  }

  // 2) Pollinations.ai: free, no key. Retries with a new seed on 5xx/timeouts.
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    const seed = Math.floor(Math.random() * 1e9);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=512&height=512&model=flux&nologo=true&referrer=ratinggallery.vercel.app&seed=${seed}`;
    const r = await tryFetchImage(fetchImpl, url, POLL_TIMEOUT_MS, { headers: { accept: 'image/*' } });
    if ('image' in r) return json({ image: r.image, latencyMs: Date.now() - started, model: 'pollinations/flux', provider: 'pollinations' }, 200);
    errors.push(`Pollinations #${attempt + 1}: ${r.error}`);
  }

  return fail('generation_unavailable', 503, errors.join(' | '), model, Date.now() - started);
}

async function tryFetchImage(fetchImpl: typeof fetch, url: string, timeoutMs: number, init: RequestInit): Promise<{ image: string } | { error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { ...init, signal: controller.signal });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.startsWith('image/')) {
      const text = await res.text().catch(() => '');
      return { error: `${res.status} ${text.slice(0, 120)}` };
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE_BYTES) return { error: `image too large (${buf.byteLength} bytes)` };
    return { image: `data:${type};base64,${toBase64(buf)}` };
  } catch (e) {
    return { error: controller.signal.aborted ? `timeout after ${timeoutMs} ms` : e instanceof Error ? e.message : 'network error' };
  } finally {
    clearTimeout(timer);
  }
}

export default {
  fetch(request: Request): Promise<Response> {
    return handle(request);
  },
};
