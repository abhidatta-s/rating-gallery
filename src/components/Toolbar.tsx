import type { Filter, SortKey } from '../types';
import type { Summary } from '../lib/gallery';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'up', label: 'Liked' },
  { key: 'down', label: 'Disliked' },
  { key: 'unrated', label: 'Unrated' },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Default order' },
  { key: 'high', label: 'Rating: high to low' },
  { key: 'low', label: 'Rating: low to high' },
  { key: 'notes', label: 'Has notes first' },
];

interface Props {
  filter: Filter;
  sort: SortKey;
  summary: Summary;
  onFilter: (f: Filter) => void;
  onSort: (s: SortKey) => void;
}

export default function Toolbar({ filter, sort, summary, onFilter, onSort }: Props) {
  const counts: Record<Filter, number> = {
    all: summary.total,
    up: summary.liked,
    down: summary.disliked,
    unrated: summary.unrated,
  };
  return (
    <div className="toolbar">
      <div className="seg" role="group" aria-label="Filter by rating">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className="seg__btn"
            aria-pressed={filter === f.key}
            data-filter={f.key}
            onClick={() => onFilter(f.key)}
          >
            {f.label} <span className="seg__count">{counts[f.key]}</span>
          </button>
        ))}
      </div>
      <label className="sort">
        <span className="sort__label">Sort</span>
        <select value={sort} onChange={(e) => onSort(e.target.value as SortKey)} data-testid="sort">
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
