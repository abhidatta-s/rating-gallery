import type { Sample } from '../types';

/**
 * Synthetic "model outputs". Previews are generated locally from the seed and
 * palette, so the app needs no images and no network access.
 */
export const SAMPLES: Sample[] = [
  { id: 's01', model: 'Model A', seed: 1042, kind: 'gradient', palette: ['#ff9a62', '#ff4f8b', '#5b3df5'], prompt: 'A warm sunset over a minimalist desert, soft gradient sky' },
  { id: 's02', model: 'Model B', seed: 2187, kind: 'mesh', palette: ['#22d3ee', '#6366f1', '#0f172a', '#a78bfa'], prompt: 'Abstract aurora borealis in deep space, glowing ribbons' },
  { id: 's03', model: 'Model A', seed: 3391, kind: 'blocks', palette: ['#f43f5e', '#fbbf24', '#10b981', '#3b82f6'], prompt: 'Bauhaus-style poster composed of geometric color blocks' },
  { id: 's04', model: 'Model C', seed: 4410, kind: 'rings', palette: ['#facc15', '#f97316', '#7c2d12'], prompt: 'Concentric ripples on a calm golden lake at dawn' },
  { id: 's05', model: 'Model B', seed: 5523, kind: 'stripes', palette: ['#38bdf8', '#0ea5e9', '#0c4a6e'], prompt: 'Clean diagonal wave pattern in oceanic blues, flat vector style' },
  { id: 's06', model: 'Model C', seed: 6608, kind: 'solid', palette: ['#14b8a6', '#042f2e'], prompt: 'Calm teal wellness app hero background, plenty of negative space' },
  { id: 's07', model: 'Model A', seed: 7714, kind: 'mesh', palette: ['#f472b6', '#c084fc', '#fde68a', '#fb7185'], prompt: 'Dreamy pastel cloudscape with candy-colored light leaks' },
  { id: 's08', model: 'Model B', seed: 8832, kind: 'gradient', palette: ['#84cc16', '#15803d', '#052e16'], prompt: 'Misty pine forest at first light, layered green depth' },
  { id: 's09', model: 'Model C', seed: 9051, kind: 'blocks', palette: ['#e2e8f0', '#64748b', '#0f172a', '#f97316'], prompt: 'Brutalist city skyline as stacked monochrome blocks with one orange accent' },
  { id: 's10', model: 'Model A', seed: 10277, kind: 'rings', palette: ['#a78bfa', '#4c1d95', '#1e1b4b'], prompt: 'Neon planetary rings against a midnight purple void' },
  { id: 's11', model: 'Model B', seed: 11364, kind: 'stripes', palette: ['#fb7185', '#fda4af', '#881337'], prompt: 'Retro 70s racing stripes in rose and burgundy' },
  { id: 's12', model: 'Model C', seed: 12499, kind: 'solid', palette: ['#f59e0b', '#451a03'], prompt: 'Minimal amber product-shot backdrop with soft vignette' },
];
