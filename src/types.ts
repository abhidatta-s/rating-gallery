export type Verdict = 'up' | 'down';

export type PreviewKind = 'gradient' | 'mesh' | 'blocks' | 'rings' | 'stripes' | 'solid';

export interface Sample {
  id: string;
  model: string;
  seed: number;
  prompt: string;
  kind: PreviewKind;
  /** 2-4 CSS colors used by the preview generator */
  palette: string[];
}

export interface Entry {
  rating: Verdict | null;
  note: string;
}

export type Entries = Record<string, Entry>;

export type Filter = 'all' | 'up' | 'down' | 'unrated';
export type SortKey = 'default' | 'high' | 'low' | 'notes';
