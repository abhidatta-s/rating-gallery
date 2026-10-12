import type { Entries, Sample } from '../types';

export function buildExport(samples: Sample[], entries: Entries): string {
  const items = samples.map((s) => {
    const e = entries[s.id];
    return {
      id: s.id,
      model: s.model,
      seed: s.seed,
      prompt: s.prompt,
      rating: e?.rating ?? null,
      note: e?.note ?? '',
      ...(s.source === 'local-import'
        ? { source: s.source, fileName: s.fileName ?? null, steps: s.steps ?? null, settingsNote: s.settingsNote ?? '', metadataReadFrom: s.metaFoundIn ?? [] }
        : {}),
    };
  });
  return JSON.stringify({ exportedAt: new Date().toISOString(), total: items.length, items }, null, 2);
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
