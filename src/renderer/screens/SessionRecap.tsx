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

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m`;
}

const CATEGORY_DOT: Record<WindowCategory, string> = {
  focus:       '#2dd4bf',
  research:    '#60a5fa',
  distraction: '#f87171',
  inactive:    '#737373',
  unknown:     '#737373',
};

export default function SessionRecap({ recap, onNewSession, onOpenSettings, accent }: Props) {
  const maxSec = Math.max(1, ...recap.appBreakdown.map((a) => a.seconds));

  const metrics = [
    { label: 'focus time', value: fmtDuration(recap.focusSec),  color: '#2dd4bf' },
    { label: 'drift time', value: fmtDuration(recap.driftSec),  color: '#f87171' },
    { label: 'switches',   value: recap.totalSwitches,           color: '#e5e5e5' },
    { label: 'nudges',     value: recap.nudgesReceived,          color: '#facc15' },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Inter', sans-serif", color: '#e5e5e5', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <GhostMascot state="happy" size={32} tint={accent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
            session complete
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#e5e5e5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
            {recap.task}
          </div>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: accent, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
          {fmtDuration(recap.durationMin * 60)}
        </div>
        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="settings"
          style={{ background: 'transparent', border: 'none', padding: '0 0 0 6px', cursor: 'pointer', color: '#525252', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#a3a3a3')}
          onMouseLeave={e => (e.currentTarget.style.color = '#525252')}
          aria-label="settings"
        >
          <GearIcon size={13} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="fg-scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
        {/* 2×2 metric grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
          {metrics.map((m) => (
            <div key={m.label} style={{ background: '#1a1a1a', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 5, padding: '10px 11px' }}>
              <div style={{ fontSize: 9, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                {m.label}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: m.color, fontWeight: 500, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Top apps */}
        <div style={{ fontSize: 9, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          top apps
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
          {recap.appBreakdown.slice(0, 3).map((a, i) => {
            const dot = CATEGORY_DOT[a.category] ?? '#737373';
            const pct = a.seconds / maxSec;
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, fontSize: 11 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                    <div style={{ color: '#d4d4d4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.app}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#a3a3a3', fontVariantNumeric: 'tabular-nums', flexShrink: 0, marginLeft: 8 }}>
                    {fmtDuration(a.seconds)}
                  </div>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct * 100}%`, background: dot, opacity: 0.8, transition: 'width 0.6s ease-out' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Ghost insight */}
        <div style={{ background: '#1a1a1a', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0, marginTop: -2 }}>
            <GhostMascot state="calm" size={22} tint={accent} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#a3a3a3', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontWeight: 500 }}>
              ghost insight
            </div>
            <div style={{ fontSize: 11, color: '#d4d4d4', lineHeight: 1.55 }}>
              {recap.insight}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px 14px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={onNewSession}
          style={{
            width: '100%',
            background: accent,
            border: `0.5px solid ${accent}`,
            borderRadius: 5,
            padding: '9px 0',
            fontSize: 11,
            fontWeight: 600,
            color: '#0a0a0a',
            fontFamily: 'inherit',
            cursor: 'pointer',
            letterSpacing: '0.02em',
          }}
        >
          start new session
        </button>
      </div>
    </div>
  );
}
