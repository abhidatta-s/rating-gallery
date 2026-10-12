/**
 * Minimal, dependency-free PNG text-chunk reader for locally generated images.
 * Reads tEXt and uncompressed iTXt chunks. Compressed chunks (zTXt, compressed iTXt)
 * are reported in `skipped` and not decoded. Never invents values: a field is only
 * set when it was found in the file.
 */
export interface PngTextChunk { type: 'tEXt' | 'iTXt'; keyword: string; text: string }

export interface ParsedMeta {
  prompt?: string;
  seed?: number;
  steps?: number;
  model?: string;
  /** Which chunk keyword(s) supplied values, for transparency. */
  foundIn: string[];
}

const SIG = [137, 80, 78, 71, 13, 10, 26, 10];

export function isPng(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && SIG.every((b, i) => bytes[i] === b);
}

const latin1 = (b: Uint8Array) => { let s = ''; for (const c of b) s += String.fromCharCode(c); return s; };
const utf8 = (b: Uint8Array) => new TextDecoder('utf-8').decode(b);

export function readPngTextChunks(bytes: Uint8Array): { chunks: PngTextChunk[]; skipped: string[] } {
  const chunks: PngTextChunk[] = [];
  const skipped: string[] = [];
  if (!isPng(bytes)) return { chunks, skipped };
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let off = 8;
  while (off + 8 <= bytes.length) {
    const len = dv.getUint32(off);
    const type = latin1(bytes.subarray(off + 4, off + 8));
    const start = off + 8;
    const end = start + len;
    if (end + 4 > bytes.length) break; // truncated file
    const data = bytes.subarray(start, end);
    if (type === 'tEXt') {
      const z = data.indexOf(0);
      if (z > 0) chunks.push({ type, keyword: latin1(data.subarray(0, z)), text: latin1(data.subarray(z + 1)) });
    } else if (type === 'iTXt') {
      const z = data.indexOf(0);
      if (z > 0) {
        const keyword = latin1(data.subarray(0, z));
        const compressed = data[z + 1] === 1;
        let p = z + 3;
        const langEnd = data.indexOf(0, p); p = langEnd + 1;
        const transEnd = data.indexOf(0, p); p = transEnd + 1;
        if (langEnd < 0 || transEnd < 0) { skipped.push(`iTXt:${keyword}(malformed)`); }
        else if (compressed) skipped.push(`iTXt:${keyword}(compressed)`);
        else chunks.push({ type, keyword, text: utf8(data.subarray(p)) });
      }
    } else if (type === 'zTXt') {
      skipped.push('zTXt(compressed)');
    } else if (type === 'IEND') break;
    off = end + 4;
  }
  return { chunks, skipped };
}

const toInt = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\s*-?\d+\s*$/.test(v) ? Number(v) : NaN;
  return Number.isSafeInteger(n) ? n : undefined;
};
const toStr = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

function decodeEntities(s: string): string {
  return s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d))).replace(/&amp;/g, '&');
}

/** JSON objects like Draw Things' XMP UserComment: {"c": prompt, "seed":…, "steps":…, "model":…} */
function fromJson(obj: Record<string, unknown>): Omit<ParsedMeta, 'foundIn'> {
  const out: Omit<ParsedMeta, 'foundIn'> = {};
  const prompt = toStr(obj.c) ?? toStr(obj.prompt) ?? toStr(obj.positive_prompt);
  if (prompt) out.prompt = prompt;
  const seed = toInt(obj.seed); if (seed !== undefined) out.seed = seed;
  const steps = toInt(obj.steps); if (steps !== undefined) out.steps = steps;
  const model = toStr(obj.model); if (model) out.model = model;
  return out;
}

function tryJson(text: string): Record<string, unknown> | null {
  const t = text.trim();
  if (!t.startsWith('{')) return null;
  try { const v: unknown = JSON.parse(t); return typeof v === 'object' && v && !Array.isArray(v) ? (v as Record<string, unknown>) : null; }
  catch { return null; }
}

/** A1111-style "parameters" text: prompt line(s), optional "Negative prompt:", then "Steps: 20, Seed: 1, Model: x". */
function fromParameters(text: string): Omit<ParsedMeta, 'foundIn'> {
  const out: Omit<ParsedMeta, 'foundIn'> = {};
  const lines = text.split(/\r?\n/);
  const settingsIdx = lines.findIndex((l) => /(^|,\s*)Steps:\s*\d+/.test(l));
  const negIdx = lines.findIndex((l) => l.startsWith('Negative prompt:'));
  const promptEnd = [negIdx, settingsIdx].filter((i) => i >= 0).reduce((a, b) => Math.min(a, b), lines.length);
  const prompt = lines.slice(0, promptEnd).join('\n').trim();
  if (prompt && settingsIdx >= 0) out.prompt = prompt; // only trust when the settings line confirms the format
  const settings = settingsIdx >= 0 ? lines[settingsIdx] as string : '';
  const grab = (k: string) => new RegExp(`(?:^|,\\s*)${k}:\\s*([^,]+)`).exec(settings)?.[1]?.trim();
  const steps = toInt(grab('Steps')); if (steps !== undefined) out.steps = steps;
  const seed = toInt(grab('Seed')); if (seed !== undefined) out.seed = seed;
  const model = toStr(grab('Model')); if (model) out.model = model;
  return out;
}

function fromXmp(xml: string): Omit<ParsedMeta, 'foundIn'> {
  const m = /<exif:UserComment>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/.exec(xml)
    ?? /exif:UserComment="([^"]*)"/.exec(xml);
  if (m?.[1]) { const j = tryJson(decodeEntities(m[1])); if (j) return fromJson(j); }
  const d = /<dc:description>[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/.exec(xml);
  if (d?.[1]) { const prompt = toStr(decodeEntities(d[1])); if (prompt) return { prompt }; }
  return {};
}

export function extractMeta(chunks: PngTextChunk[]): ParsedMeta {
  const meta: ParsedMeta = { foundIn: [] };
  const merge = (src: Omit<ParsedMeta, 'foundIn'>, kw: string) => {
    let used = false;
    for (const k of ['prompt', 'seed', 'steps', 'model'] as const) {
      if (src[k] !== undefined && meta[k] === undefined) { (meta as unknown as Record<string, unknown>)[k] = src[k]; used = true; }
    }
    if (used) meta.foundIn.push(kw);
  };
  for (const c of chunks) {
    const kw = c.keyword;
    if (kw === 'XML:com.adobe.xmp') merge(fromXmp(c.text), kw);
    else {
      const j = tryJson(c.text);
      if (j) merge(fromJson(j), kw);
      else if (/^parameters$/i.test(kw)) merge(fromParameters(c.text), kw);
    }
  }
  return meta;
}

export function parsePngMeta(bytes: Uint8Array): ParsedMeta & { skipped: string[] } {
  const { chunks, skipped } = readPngTextChunks(bytes);
  return { ...extractMeta(chunks), skipped };
}
