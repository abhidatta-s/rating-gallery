# Rating Gallery

A small, fast interface for **human-in-the-loop evaluation of AI-generated visual outputs**. Browse a grid of generated results, give each one a thumbs up or down, jot a note, then filter, sort and export your judgments as JSON.

![Rating Gallery screenshot](docs/screenshot.png)

## Live Demo

**https://rating-gallery.vercel.app** *(placeholder: update this link once deployed)*

The source repository is private; only the deployed demo is public.

## What this demonstrates

Automated metrics only tell part of the story when you evaluate generative image models. Prompt adherence, aesthetics and "does this feel right" still need a person in the loop. This project is a compact reference for that workflow:

- **Side-by-side judgment.** Outputs from several models (A, B, C) and seeds sit in one grid, so reviewers compare like with like.
- **Low-friction labeling.** One click for a binary verdict, plus an optional free-text note to capture the reason behind it.
- **Fast triage.** Filter by verdict, sort by rating or notes, and watch progress and approval rate update live.
- **Portable results.** Export the labeled set as JSON (download or copy) so it can feed analysis, model comparison or fine-tuning pipelines.
- **Accessible by default.** Native buttons with `aria-pressed`, labelled form fields, visible focus and live-region announcements.

The sample "model outputs" are generated locally from a seed (inline SVG), so the demo needs no images, API keys or network access.

## Features

- 12 sample cards with generated previews, model label, seed and prompt
- Thumbs up / thumbs down rating (click again to clear)
- Optional note per card, debounced autosave (flushed on blur)
- Filter: All / Liked / Disliked / Unrated, with live counts
- Sort: Default, Rating high to low, Rating low to high, Has notes first
- Summary bar: rated x/N, % liked, disliked, notes, progress
- Persistence in `localStorage` (validated on load; corrupt data is ignored)
- Export ratings as a JSON file or copy to clipboard
- Reset with confirmation and an 8-second Undo
- Keyboard accessible, responsive grid, dark UI, reduced-motion support
- Runtime dependencies: `react` and `react-dom` only

## Getting started

Requires Node.js 20.19 or newer.

```bash
npm install
npm run dev
```

Open the URL Vite prints (default http://localhost:5173).

## Scripts

| Script              | Description                              |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Start the Vite dev server                |
| `npm run build`     | Type-check (`tsc --noEmit`) and build    |
| `npm run preview`   | Serve the production build locally       |
| `npm run typecheck` | Type-check only                          |

## Export format

```json
{
  "exportedAt": "2026-01-01T12:00:00.000Z",
  "total": 12,
  "items": [
    { "id": "s01", "model": "Model A", "seed": 1042, "prompt": "...", "rating": "up", "note": "..." }
  ]
}
```

`rating` is `"up"`, `"down"` or `null` (unrated).

## Project structure

```
rating-gallery/
├── docs/screenshot.png
├── public/favicon.svg
├── src/
│   ├── components/
│   │   ├── Card.tsx          # preview, prompt, rating, debounced note
│   │   ├── Preview.tsx       # seeded inline-SVG "model output" generator
│   │   ├── SummaryBar.tsx
│   │   └── Toolbar.tsx       # filter + sort controls
│   ├── data/samples.ts       # sample prompts, models, seeds, palettes
│   ├── hooks/useEntries.ts   # ratings/notes state + localStorage sync
│   ├── lib/
│   │   ├── exportRatings.ts  # JSON build, download, clipboard
│   │   ├── gallery.ts        # filter, sort, summary (pure functions)
│   │   ├── prng.ts           # deterministic PRNG for previews
│   │   └── storage.ts        # validated localStorage access
│   ├── App.tsx
│   ├── main.tsx
│   ├── styles.css            # plain CSS with variables
│   └── types.ts
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Deploy notes

Deploy to Vercel with the Vite defaults:

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`

Vercel Authentication is on by default for new projects. To make the demo URL public, turn it off under **Settings → Deployment Protection**.

Ratings are stored in each visitor's own browser (`localStorage`), so nothing is shared or sent to a server.

## Generation fallback

`/api/generate` tries Hugging Face (server-side `HF_TOKEN`) first. If that fails (for example 402, no inference credits on a free account), it uses the free, keyless Pollinations.ai API (flux) with one retry. If both fail, the UI adds one of six pre-generated sample images from `public/samples/` (made with Pollinations) and shows "Live generation busy, showing samples." Raw backend errors are never shown.
