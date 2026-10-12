import type { Sample } from '../types';
import { parsePngMeta } from './pngMeta';

export const IMPORTED_KEY = 'rating-gallery:imported:v1';
export const DEFAULT_IMPORT_MODEL = 'FLUX.2 klein 4B (Draw Things)';
export const MAX_DIM = 768;
export const JPEG_QUALITY = 0.85;
export const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

export function isAccepted(file: { type: string; name: string }): boolean {
  return ACCEPTED.includes(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name);
}

export function isImported(s: Sample): boolean { return s.source === 'local-import'; }

function isImportedSample(v: unknown): v is Sample {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  return s.source === 'local-import' && typeof s.id === 'string' && typeof s.prompt === 'string'
    && typeof s.model === 'string' && typeof s.imageUrl === 'string' && s.imageUrl.startsWith('data:image/');
}

export function loadImported(): Sample[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(IMPORTED_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isImportedSample) : [];
  } catch { return []; }
}

/** Returns true on success, false on quota/storage error (caller shows a message). */
export function saveImported(list: Sample[]): boolean {
  try { window.localStorage.setItem(IMPORTED_KEY, JSON.stringify(list)); return true; }
  catch { return false; }
}

export function fitWithin(w: number, h: number, max = MAX_DIM): { w: number; h: number } {
  if (w <= max && h <= max) return { w, h };
  const k = max / Math.max(w, h);
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

async function downscale(file: Blob): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const { w, h } = fitWithin(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); // JPEG has no alpha
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } finally { URL.revokeObjectURL(url); }
}

let counter = 0;
/** Reads one file entirely in the browser. Nothing is uploaded. */
export async function fileToSample(file: File): Promise<Sample> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const meta = parsePngMeta(bytes);
  const imageUrl = await downscale(file);
  return {
    id: `i-${Date.now().toString(36)}-${(counter++).toString(36)}`,
    source: 'local-import',
    fileName: file.name,
    model: meta.model ?? DEFAULT_IMPORT_MODEL,
    seed: meta.seed ?? null,
    steps: meta.steps ?? null,
    prompt: meta.prompt ?? '',
    settingsNote: '',
    metaFoundIn: meta.foundIn,
    kind: 'solid',
    palette: ['#888', '#222'],
    imageUrl,
  };
}
