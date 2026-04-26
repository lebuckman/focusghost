import React from 'react';
import type { GhostMascotState } from '../../shared/ipc-contract';

interface Props {
  state: GhostMascotState;
  size?: number;
  tint?: string;
}

// Map ipc-contract states to visual states used in the design
type VisualState = 'calm' | 'drifting' | 'stuck' | 'happy' | 'sleepy';
function toVisual(state: GhostMascotState): VisualState {
  if (state === 'concerned') return 'drifting';
  if (state === 'thinking')  return 'stuck';
  return state as VisualState;
}

const TINT: Record<VisualState, string> = {
  calm:     '#5dd8e6',
  drifting: '#7dc8d8',
  stuck:    '#6fc4d4',
  happy:    '#6fe0d4',
  sleepy:   '#6fb8c8',
};

const ANIM: Record<VisualState, string> = {
  calm:     'ghostFloat 4s ease-in-out infinite',
  drifting: 'ghostWobble 1.2s ease-in-out infinite',
  stuck:    'ghostThink 2s ease-in-out infinite',
  happy:    'ghostFloat 3s ease-in-out infinite',
  sleepy:   'ghostFloat 5s ease-in-out infinite',
};

// Eye shape config per state
const EYES: Record<VisualState, { yRatio: number; hRatio: number; wRatio: number; squint: number }> = {
  calm:     { yRatio: 0.42, hRatio: 0.08, wRatio: 0.08, squint: 0 },
  drifting: { yRatio: 0.42, hRatio: 0.06, wRatio: 0.10, squint: 0.3 },
  stuck:    { yRatio: 0.42, hRatio: 0.10, wRatio: 0.06, squint: 0 },
  happy:    { yRatio: 0.42, hRatio: 0.03, wRatio: 0.12, squint: 0.8 },
  sleepy:   { yRatio: 0.44, hRatio: 0.02, wRatio: 0.10, squint: 1 },
};

export default function GhostMascot({ state, size = 48, tint: tintOverride }: Props) {
  const vs = toVisual(state);
  const w = size;
  const h = size * 1.1;
  const eyes = EYES[vs];
  const bodyTint = tintOverride ?? TINT[vs];
  const shadowColor = tintOverride ?? '#5dd8e6';

  return (
    <div style={{ display: 'inline-block', width: w, height: h, flexShrink: 0 }}>
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{
          filter: `drop-shadow(0 0 6px ${shadowColor}8c) drop-shadow(0 0 12px ${shadowColor}40)`,
          animation: ANIM[vs],
        }}
      >
        {/* Body */}
        <path
          d={`
            M ${w * 0.15} ${h * 0.5}
            Q ${w * 0.15} ${h * 0.1}, ${w * 0.5} ${h * 0.1}
            Q ${w * 0.85} ${h * 0.1}, ${w * 0.85} ${h * 0.5}
            L ${w * 0.85} ${h * 0.85}
            Q ${w * 0.78} ${h * 0.95}, ${w * 0.70} ${h * 0.85}
            Q ${w * 0.60} ${h * 0.75}, ${w * 0.50} ${h * 0.85}
            Q ${w * 0.40} ${h * 0.95}, ${w * 0.30} ${h * 0.85}
            Q ${w * 0.22} ${h * 0.75}, ${w * 0.15} ${h * 0.85}
            Z
          `}
          fill={bodyTint}
          opacity={0.95}
        />
        {/* Left eye */}
        <ellipse
          cx={w * 0.38}
          cy={h * eyes.yRatio}
          rx={w * eyes.wRatio / 2}
          ry={h * eyes.hRatio / 2 * (1 - eyes.squint * 0.9)}
          fill="#111"
        />
        {/* Right eye */}
        <ellipse
          cx={w * 0.62}
          cy={h * eyes.yRatio}
          rx={w * eyes.wRatio / 2}
          ry={h * eyes.hRatio / 2 * (1 - eyes.squint * 0.9)}
          fill="#111"
        />
        {/* Drifting: blush circles */}
        {vs === 'drifting' && (
          <>
            <circle cx={w * 0.28} cy={h * 0.55} r={w * 0.04} fill="#f87171" opacity={0.4} />
            <circle cx={w * 0.72} cy={h * 0.55} r={w * 0.04} fill="#f87171" opacity={0.4} />
          </>
        )}
        {/* Stuck: small closed mouth */}
        {vs === 'stuck' && (
          <ellipse cx={w * 0.5} cy={h * 0.58} rx={w * 0.04} ry={h * 0.02} fill="#111" />
        )}
        {/* Happy: smile arc */}
        {vs === 'happy' && (
          <path
            d={`M ${w * 0.42} ${h * 0.56} Q ${w * 0.5} ${h * 0.62}, ${w * 0.58} ${h * 0.56}`}
            stroke="#111"
            strokeWidth={1}
            fill="none"
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}
