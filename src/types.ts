export type Verdict = 'up' | 'down';

export type PreviewKind = 'gradient' | 'mesh' | 'blocks' | 'rings' | 'stripes' | 'solid';

export interface Sample {
  id: string;
  model: string;
  /** null only for imported images whose seed is unknown. */
  seed: number | null;
  prompt: string;
  kind: PreviewKind;
  /** 2-4 CSS colors used by the preview generator */
  palette: string[];
  /** Set only for cards generated via /api/generate (data URL). */
  imageUrl?: string;
  /** Set for images imported from local files (e.g. Draw Things). */
  source?: 'local-import';
  fileName?: string;
  steps?: number | null;
  settingsNote?: string;
  /** PNG chunk keywords metadata was read from; empty = nothing auto-filled. */
  metaFoundIn?: string[];
}

export interface Entry {
  rating: Verdict | null;
  note: string;
}

export type Entries = Record<string, Entry>;

export type Filter = 'all' | 'up' | 'down' | 'unrated';
export type SortKey = 'default' | 'high' | 'low' | 'notes';
