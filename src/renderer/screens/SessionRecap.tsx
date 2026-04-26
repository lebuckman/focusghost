import React from 'react';
import GhostMascot from '../components/GhostMascot';
import { GearIcon } from './Settings';
import type { SessionRecapPayload, WindowCategory } from '../../shared/ipc-contract';

interface Props {
  recap: SessionRecapPayload;
  onNewSession: () => void;
  onOpenSettings: () => void;
  accent: string;
}

function fmtMin(sec: number): string {
  const m = Math.floor(sec / 60);
  return m === 0 ? `${sec}s` : `${m}m`;
}

const TRAIL_ICONS: Record<string, { glyph: string; fg: string; bg: string }> = {
  'VS Code':            { glyph: '</>',  fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  'Visual Studio Code': { glyph: '</>',  fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  'Cursor':             { glyph: '</>',  fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  'WebStorm':           { glyph: 'WS',   fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  'Terminal':           { glyph: '›_',   fg: '#5dd8e6', bg: 'rgba(93,216,230,0.12)'  },
  'iTerm2':             { glyph: '›_',   fg: '#5dd8e6', bg: 'rgba(93,216,230,0.12)'  },
  'Discord':            { glyph: '💬',   fg: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  'YouTube':            { glyph: '▶',    fg: '#f87171', bg: 'rgba(248,113,113,0.14)' },
  'Twitter':            { glyph: '✕',    fg: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  'X':                  { glyph: '✕',    fg: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  'Reddit':             { glyph: 'R',    fg: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  'Instagram':          { glyph: '◯',    fg: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  'TikTok':             { glyph: '♪',    fg: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  'Twitch':             { glyph: '▶',    fg: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  'Chrome':             { glyph: '◎',    fg: '#5dd8e6', bg: 'rgba(93,216,230,0.12)'  },
  'Google Chrome':      { glyph: '◎',    fg: '#5dd8e6', bg: 'rgba(93,216,230,0.12)'  },
  'Safari':             { glyph: '◎',    fg: '#5dd8e6', bg: 'rgba(93,216,230,0.12)'  },
  'Arc':                { glyph: '◎',    fg: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  'Firefox':            { glyph: '◎',    fg: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  'Notion':             { glyph: 'N',    fg: '#e5e5e5', bg: 'rgba(229,229,229,0.10)' },
  'Figma':              { glyph: 'F',    fg: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  'Spotify':            { glyph: '♫',    fg: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  'Slack':              { glyph: '#',    fg: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  'Google Docs':        { glyph: '▤',    fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  'Zoom':               { glyph: '⬡',    fg: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
};

interface TrailNode {
  app: string;
  category: WindowCategory;
  tag: string | null;
}

// ── Ghost Trail ───────────────────────────────────────────────────────────────

function GhostTrail({ nodes }: { nodes: TrailNode[] }) {
  if (!nodes || nodes.length === 0) return null;

  const W = 348;
  const H = 132;
  const padX = 26;
  const cy = 56;
  const slots = nodes.length;
  const step = (W - padX * 2) / Math.max(1, slots - 1);

  const driftIdx = nodes.findIndex(n => n.category === 'distraction');
  const ghostIdx = driftIdx === -1 ? Math.floor(slots / 2) : driftIdx;
  const ghostXFrac = (padX + ghostIdx * step - 6) / W;

  const points = nodes.map((_, i) => ({ x: padX + i * step, y: cy }));
  const wavePath = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const midX = (prev.x + p.x) / 2;
    const dir = i % 2 === 0 ? -1 : 1;
    return acc + ` Q ${midX} ${p.y + dir * 14} ${p.x} ${p.y}`;
  }, '');

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(93,216,230,0.04) 0%, rgba(255,255,255,0.015) 100%)',
      border: '0.5px solid rgba(93,216,230,0.15)',
      borderRadius: 8,
      padding: '11px 12px 12px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 9, color: '#5dd8e6', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>
          ghost trail
        </div>
        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#525252" strokeWidth={2}>
          <circle cx={12} cy={12} r={10} />
          <line x1={12} y1={8} x2={12} y2={12} strokeLinecap="round" />
          <circle cx={12} cy={16} r={0.5} fill="#525252" />
        </svg>
      </div>

      <div style={{ position: 'relative', width: '100%', height: H }}>
        {/* Wavy connecting path */}
        <svg
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ position: 'absolute', inset: 0 }}
        >
          <defs>
            <linearGradient id="trailGrad" x1="0" y1="0" x2="1" y2="0">
              {nodes.map((n, i) => {
                const c = n.category === 'distraction' ? '#f87171'
                        : n.category === 'research'    ? '#60a5fa'
                        : n.category === 'focus'       ? '#5dd8e6'
                        : '#737373';
                return <stop key={i} offset={`${(i / Math.max(1, slots - 1)) * 100}%`} stopColor={c} />;
              })}
            </linearGradient>
          </defs>
          <path
            d={wavePath}
            stroke="url(#trailGrad)"
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 4px rgba(93,216,230,0.4))' }}
          />
        </svg>

        {/* Ghost hovering above drift point */}
        <div style={{
          position: 'absolute',
          left: `calc(${ghostXFrac * 100}% - 7px)`,
          top: cy - 30,
          opacity: 0.85,
          filter: 'drop-shadow(0 0 6px rgba(93,216,230,0.5))',
        }}>
          <GhostMascot state={driftIdx === -1 ? 'calm' : 'concerned'} size={14} />
        </div>

        {/* App nodes */}
        {nodes.map((n, i) => {
          const xFrac = (padX + i * step) / W;
          const ic = TRAIL_ICONS[n.app] ?? { glyph: n.app.charAt(0).toUpperCase(), fg: '#a3a3a3', bg: 'rgba(255,255,255,0.06)' };
          const cat = n.category ?? 'inactive';
          const ring = cat === 'distraction' ? '#f87171'
                     : cat === 'research'    ? '#60a5fa'
                     : cat === 'focus'       ? '#5dd8e6'
                     : '#525252';
          const tagColor = cat === 'distraction' ? '#f87171'
                         : (cat === 'focus' && i === nodes.length - 1) ? '#5dd8e6'
                         : '#737373';
          return (
            <div key={i} style={{
              position: 'absolute',
              left: `calc(${xFrac * 100}% - 17px)`,
              top: cy - 17,
              width: 34,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <div style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: ic.bg,
                border: `1px solid ${ring}`,
                boxShadow: `0 0 10px ${ring}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                color: ic.fg,
                fontWeight: 600,
              }}>
                {ic.glyph}
              </div>
              <div style={{
                fontSize: 8.5,
                color: tagColor,
                marginTop: 5,
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                fontWeight: 500,
              }}>
                {n.app}
              </div>
              {n.tag && (
                <div style={{
                  fontSize: 7.5,
                  color: tagColor,
                  marginTop: 2,
                  letterSpacing: '0.06em',
                  textTransform: 'lowercase',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  borderTop: '0.5px dashed rgba(255,255,255,0.1)',
                  paddingTop: 2,
                }}>
                  {n.tag}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function SessionRecap({ recap, onNewSession, onOpenSettings, accent }: Props) {
  const totalSec   = recap.focusSec + recap.driftSec;
  const plannedSec = recap.durationMin * 60;
  const completedPct = Math.min(100, Math.round((totalSec / Math.max(1, plannedSec)) * 100));
  const earlyEnd   = totalSec < plannedSec - 5;

  const metrics = [
    { label: 'focus time', value: fmtMin(recap.focusSec),  color: '#2dd4bf' },
    { label: 'drift time', value: fmtMin(recap.driftSec),  color: '#f87171' },
    { label: 'switches',   value: recap.totalSwitches,       color: '#e5e5e5' },
    { label: 'nudges',     value: recap.nudgesReceived,       color: '#facc15' },
  ] as const;

  // Build trail nodes from appBreakdown (up to 5 apps)
  const rawNodes = recap.appBreakdown.slice(0, 5);
  const trailNodes: TrailNode[] = rawNodes.map((a, i) => {
    let tag: string | null = null;
    if (i === 0) tag = 'start';
    else if (i === rawNodes.length - 1) tag = 'recovery';
    else if (a.category === 'distraction') {
      const prevDistraction = rawNodes.slice(0, i).some(n => n.category === 'distraction');
      tag = prevDistraction ? 'drift chain' : 'drift portal';
    }
    return { app: a.app, category: a.category, tag };
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      fontFamily: "'Inter', sans-serif",
      color: '#e5e5e5',
      overflow: 'hidden',
      background: 'radial-gradient(circle at 50% -10%, rgba(93,216,230,0.07) 0%, transparent 55%), #111',
    }}>
      {/* Header */}
      <div style={{
        position: 'relative',
        padding: '14px 14px 12px',
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        overflow: 'hidden',
      }}>
        {/* Sparkle dots */}
        {([
          { x: 24,  y: 8,  s: 2.5, o: 0.5 },
          { x: 340, y: 14, s: 2,   o: 0.4 },
          { x: 300, y: 50, s: 2,   o: 0.4 },
        ] as const).map((d, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: d.y, left: d.x,
            width: d.s, height: d.s,
            borderRadius: '50%',
            background: '#5dd8e6',
            opacity: d.o,
            boxShadow: '0 0 5px rgba(93,216,230,0.6)',
            pointerEvents: 'none',
          }} />
        ))}

        <div style={{ filter: 'drop-shadow(0 0 12px rgba(93,216,230,0.45))', flexShrink: 0 }}>
          <GhostMascot state="happy" size={36} tint={accent} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 2, fontWeight: 500 }}>
            session complete
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#f5f5f5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            {recap.task}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 16,
              color: earlyEnd ? '#facc15' : accent,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}>
              {fmtMin(totalSec)}
            </div>
            <div style={{
              fontSize: 8,
              color: earlyEnd ? '#a3a3a3' : '#525252',
              marginTop: 2,
              letterSpacing: '0.06em',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {completedPct}% of {recap.durationMin}m
            </div>
          </div>
          <button
            onClick={onOpenSettings}
            title="settings"
            style={{ background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', color: '#525252', display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#a3a3a3')}
            onMouseLeave={e => (e.currentTarget.style.color = '#525252')}
            aria-label="settings"
          >
            <GearIcon size={14} />
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="fg-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 14px' }}>
        {/* 2×2 metric grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
          {metrics.map((m) => (
            <div key={m.label} style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)', backdropFilter: 'blur(8px)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: 6, padding: '10px 11px', opacity: 0.85 }}>
              <div style={{ fontSize: 9, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                {m.label}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: m.color, fontWeight: 500, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Ghost trail */}
        <GhostTrail nodes={trailNodes} />

        <div style={{ height: 12 }} />

        {/* Ghost trail insight */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(93,216,230,0.06) 0%, rgba(255,255,255,0.02) 100%)',
          backdropFilter: 'blur(8px)',
          opacity: 0.85,
          border: '0.5px solid rgba(93,216,230,0.18)',
          borderRadius: 8,
          padding: '12px 13px',
          display: 'flex',
          gap: 11,
          alignItems: 'flex-start',
        }}>
          <div style={{ flexShrink: 0, marginTop: 1, filter: 'drop-shadow(0 0 8px rgba(93,216,230,0.3))' }}>
            <GhostMascot state="calm" size={26} tint={accent} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5, fontWeight: 500 }}>
              ghost trail insight
            </div>
            <div style={{ fontSize: 11.5, color: '#d4d4d4', lineHeight: 1.55, letterSpacing: '-0.005em' }}>
              {recap.insight}
            </div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{ padding: '10px 14px 14px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={onNewSession}
          style={{
            width: '100%',
            background: 'linear-gradient(180deg, #5dd8e6 0%, #2dd4bf 100%)',
            border: '0.5px solid #5dd8e6',
            borderRadius: 6,
            padding: '11px 0',
            fontSize: 11,
            fontWeight: 600,
            color: '#082025',
            fontFamily: 'inherit',
            cursor: 'pointer',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            boxShadow: '0 4px 12px -4px rgba(93,216,230,0.5), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          start new session
        </button>
      </div>
    </div>
  );
}
