import { useId } from 'react';
import type { Sample } from '../types';
import { mulberry32 } from '../lib/prng';

const W = 400;
const H = 300;

function Art({ sample, uid }: { sample: Sample; uid: string }) {
  const rnd = mulberry32(sample.seed);
  const p = sample.palette;
  const c = (i: number) => p[i % p.length] as string;

  switch (sample.kind) {
    case 'gradient': {
      const angle = Math.round(rnd() * 60 + 60);
      const hills = [0, 1, 2].map((i) => {
        const y = 170 + i * 36 + rnd() * 14;
        const a = 20 + rnd() * 40;
        return `M0 ${H} L0 ${y} Q ${100 + rnd() * 60} ${y - a} 200 ${y} T ${W} ${y - 8} L${W} ${H} Z`;
      });
      return (
        <>
          <defs>
            <linearGradient id={`${uid}-g`} gradientTransform={`rotate(${angle} .5 .5)`}>
              {p.map((col, i) => (
                <stop key={i} offset={`${(i / (p.length - 1)) * 100}%`} stopColor={col} />
              ))}
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill={`url(#${uid}-g)`} />
          <circle cx={90 + rnd() * 220} cy={80 + rnd() * 40} r={26 + rnd() * 16} fill="#fff" opacity=".35" />
          {hills.map((d, i) => (
            <path key={i} d={d} fill="#000" opacity={0.14 + i * 0.14} />
          ))}
        </>
      );
    }
    case 'mesh': {
      const blobs = p.map((col, i) => ({
        col,
        cx: rnd() * W,
        cy: rnd() * H,
        r: 120 + rnd() * 90,
        id: `${uid}-m${i}`,
      }));
      return (
        <>
          <defs>
            {blobs.map((b) => (
              <radialGradient key={b.id} id={b.id}>
                <stop offset="0%" stopColor={b.col} stopOpacity="0.95" />
                <stop offset="100%" stopColor={b.col} stopOpacity="0" />
              </radialGradient>
            ))}
          </defs>
          <rect width={W} height={H} fill={c(2)} />
          {blobs.map((b) => (
            <circle key={b.id} cx={b.cx} cy={b.cy} r={b.r} fill={`url(#${b.id})`} />
          ))}
        </>
      );
    }
    case 'blocks': {
      const cols = 4;
      const rows = 3;
      const cw = W / cols;
      const rh = H / rows;
      const cells = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const t = rnd();
          const col = c(Math.floor(rnd() * p.length));
          cells.push(
            t < 0.55 ? (
              <rect key={`${x}${y}`} x={x * cw} y={y * rh} width={cw} height={rh} fill={col} />
            ) : t < 0.8 ? (
              <circle key={`${x}${y}`} cx={x * cw + cw / 2} cy={y * rh + rh / 2} r={Math.min(cw, rh) / 2 - 4} fill={col} />
            ) : (
              <path key={`${x}${y}`} d={`M${x * cw} ${(y + 1) * rh} L${(x + 1) * cw} ${(y + 1) * rh} L${x * cw} ${y * rh} Z`} fill={col} />
            ),
          );
        }
      }
      return (
        <>
          <rect width={W} height={H} fill="#111827" />
          {cells}
        </>
      );
    }
    case 'rings': {
      const cx = 140 + rnd() * 120;
      const cy = 100 + rnd() * 100;
      const n = 9;
      return (
        <>
          <rect width={W} height={H} fill={c(2)} />
          {Array.from({ length: n }, (_, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={(n - i) * 24}
              fill={i % 2 === 0 ? c(0) : c(1)}
              opacity={0.25 + (i / n) * 0.7}
            />
          ))}
        </>
      );
    }
    case 'stripes': {
      const angle = Math.round(rnd() * 50 - 25 + 35);
      const n = 12;
      const sw = (W + H) / n;
      return (
        <>
          <rect width={W} height={H} fill={c(2)} />
          <g transform={`rotate(${angle} ${W / 2} ${H / 2})`}>
            {Array.from({ length: n + 4 }, (_, i) => (
              <rect
                key={i}
                x={-120 + i * sw}
                y={-200}
                width={sw * (0.35 + rnd() * 0.3)}
                height={H + 400}
                fill={i % 2 ? c(0) : c(1)}
              />
            ))}
          </g>
        </>
      );
    }
    case 'solid':
    default:
      return (
        <>
          <defs>
            <radialGradient id={`${uid}-v`} cx="50%" cy="45%" r="75%">
              <stop offset="55%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor={c(1)} stopOpacity="0.85" />
            </radialGradient>
          </defs>
          <rect width={W} height={H} fill={c(0)} />
          <rect width={W} height={H} fill={`url(#${uid}-v)`} />
          <rect x={W / 2 - 60} y={H / 2 - 40} width="120" height="80" rx="14" fill="#fff" opacity=".14" />
        </>
      );
  }
}

export default function Preview({ sample }: { sample: Sample }) {
  const uid = useId().replace(/:/g, '');
  return (
    <div className="preview">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`Generated preview, ${sample.model}, seed ${sample.seed}`}
      >
        <Art sample={sample} uid={uid} />
      </svg>
      <span className="chip chip--model">{sample.model}</span>
      <span className="chip chip--seed">seed {sample.seed}</span>
    </div>
  );
}
