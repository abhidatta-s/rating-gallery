import type { Entries, Filter, Sample, SortKey } from '../types';

export function matchesFilter(filter: Filter, entries: Entries, id: string): boolean {
  const r = entries[id]?.rating ?? null;
  switch (filter) {
    case 'all': return true;
    case 'up': return r === 'up';
    case 'down': return r === 'down';
    case 'unrated': return r === null;
  }
}

function score(entries: Entries, id: string): number {
  const r = entries[id]?.rating ?? null;
  return r === 'up' ? 1 : r === 'down' ? -1 : 0;
}

function hasNote(entries: Entries, id: string): boolean {
  return (entries[id]?.note.trim().length ?? 0) > 0;
}

/** Returns a new array; ties keep the original order (Array.prototype.sort is stable). */
export function sortSamples(samples: Sample[], entries: Entries, key: SortKey): Sample[] {
  const list = [...samples];
  switch (key) {
    case 'default': return list;
    case 'high': return list.sort((a, b) => score(entries, b.id) - score(entries, a.id));
    case 'low': return list.sort((a, b) => score(entries, a.id) - score(entries, b.id));
    case 'notes': return list.sort((a, b) => Number(hasNote(entries, b.id)) - Number(hasNote(entries, a.id)));
  }
}

export interface Summary {
  total: number;
  rated: number;
  liked: number;
  disliked: number;
  unrated: number;
  withNotes: number;
  likedPct: number | null;
}

export function summarize(samples: Sample[], entries: Entries): Summary {
  let liked = 0;
  let disliked = 0;
  let withNotes = 0;
  for (const s of samples) {
    const r = entries[s.id]?.rating ?? null;
    if (r === 'up') liked++;
    if (r === 'down') disliked++;
    if (hasNote(entries, s.id)) withNotes++;
  }
  const rated = liked + disliked;
  return {
    total: samples.length,
    rated,
    liked,
    disliked,
    unrated: samples.length - rated,
    withNotes,
    likedPct: rated === 0 ? null : Math.round((liked / rated) * 100),
  };
}
