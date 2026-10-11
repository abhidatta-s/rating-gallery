import type { Entries, Entry } from '../types';

export const STORAGE_KEY = 'rating-gallery:v1';

function isEntry(v: unknown): v is Entry {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, unknown>;
  return (e.rating === null || e.rating === 'up' || e.rating === 'down') && typeof e.note === 'string';
}

/** Reads and validates saved entries; anything malformed is dropped. */
export function loadEntries(): Entries {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const out: Entries = {};
    for (const [id, v] of Object.entries(parsed)) {
      if (isEntry(v)) out[id] = { rating: v.rating, note: v.note };
    }
    return out;
  } catch {
    return {};
  }
}

export function saveEntries(entries: Entries): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}
