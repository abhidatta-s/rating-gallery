import { useCallback, useEffect, useRef, useState } from 'react';
import type { Entries, Verdict } from '../types';
import { loadEntries, saveEntries } from '../lib/storage';

export function useEntries() {
  const [entries, setEntries] = useState<Entries>(() => loadEntries());
  const [persistError, setPersistError] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setPersistError(!saveEntries(entries));
  }, [entries]);

  const setRating = useCallback((id: string, rating: Verdict | null) => {
    setEntries((prev) => ({ ...prev, [id]: { note: prev[id]?.note ?? '', rating } }));
  }, []);

  const setNote = useCallback((id: string, note: string) => {
    setEntries((prev) => {
      if ((prev[id]?.note ?? '') === note) return prev;
      return { ...prev, [id]: { rating: prev[id]?.rating ?? null, note } };
    });
  }, []);

  const replaceAll = useCallback((next: Entries) => setEntries(next), []);

  return { entries, setRating, setNote, replaceAll, persistError };
}
