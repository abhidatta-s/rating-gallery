/**
 * POST /api/generate  { "prompt": string }
 *
 * Vercel Function (Node.js runtime, Web-standard fetch handler). Calls the
 * Hugging Face Inference router for ONE text-to-image model. The HF token is
 * read from the server-side env var HF_TOKEN and is never logged or returned.
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
const TIMEOUT_MS = 25_000;
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

  const token = process.env.HF_TOKEN;
  if (!token) {
    return fail('missing_token', 500, 'HF_TOKEN is not set on the server.', model);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const upstream = await fetchImpl(`https://router.huggingface.co/hf-inference/models/${model}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'image/*' },
      body: JSON.stringify({ inputs: prompt.trim() }),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - started;
    const type = upstream.headers.get('content-type') ?? '';

    if (!upstream.ok || !type.startsWith('image/')) {
      const text = await upstream.text().catch(() => '');
      const status = upstream.ok ? 502 : upstream.status;
      return fail('upstream_error', status, `HF responded ${upstream.status} (${type || 'no content-type'}): ${text}`, model, latencyMs);
    }
    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE_BYTES) {
      return fail('image_too_large', 502, `Image was ${buf.byteLength} bytes; limit ${MAX_IMAGE_BYTES}.`, model, latencyMs);
    }
    return json({ image: `data:${type};base64,${toBase64(buf)}`, latencyMs, model }, 200);
  } catch (e) {
    const latencyMs = Date.now() - started;
    if (controller.signal.aborted) {
      return fail('timeout', 504, `No response from HF within ${TIMEOUT_MS} ms.`, model, latencyMs);
    }
    return fail('network_error', 502, e instanceof Error ? e.message : 'Unknown error', model, latencyMs);
  } finally {
    clearTimeout(timer);
  }
}

export default {
  fetch(request: Request): Promise<Response> {
    return handle(request);
  },
};
