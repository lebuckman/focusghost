import React, { useEffect } from 'react';
import GhostMascot from '../components/GhostMascot';
import AppBadge from '../components/AppBadge';
import MetricChip from '../components/MetricChip';
import type { SessionUpdate, WindowCategory } from '../../shared/ipc-contract';

interface Props {
  task: string;
  durationMin: number;
  sessionUpdate: SessionUpdate;
  onOpenChat: () => void;
}

function fmtCountdown(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
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

const iconBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  width: 22,
  height: 22,
  padding: 0,
  borderRadius: 4,
  cursor: 'pointer',
  color: '#737373',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function ActiveSession({ task, durationMin, sessionUpdate, onOpenChat }: Props) {
  // endSession IPC is fired from the button directly; session recap listener lives in App
  useEffect(() => {
    // nothing to register — all IPC listeners live in App.tsx
  }, []);

  const durationSec = durationMin * 60;
  const remaining = Math.max(0, durationSec - sessionUpdate.elapsedSec);
  const progress = Math.min(1, sessionUpdate.elapsedSec / Math.max(1, durationSec));

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: "'Inter', sans-serif",
        color: '#e5e5e5',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 8 }}>
          <div style={{
            fontSize: 12,
            color: '#e5e5e5',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0,
            letterSpacing: '-0.01em',
          }}>
            {task}
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            color: '#2dd4bf',
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
          }}>
            {fmtCountdown(remaining)}
          </div>
          <div style={{ display: 'flex', gap: 2, flexShrink: 0, marginLeft: 2 }}>
            <button onClick={onOpenChat} title="chat" style={iconBtn} aria-label="chat">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1.5 3.5 Q 1.5 2, 3 2 H 9 Q 10.5 2, 10.5 3.5 V 6.5 Q 10.5 8, 9 8 H 5 L 3 10 V 8 Q 1.5 8, 1.5 6.5 Z"
                  stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" fill="none" />
              </svg>
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: '#2dd4bf', transition: 'width 0.5s linear' }} />
        </div>
      </div>

      {/* Current app row */}
      <div style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: 10, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em' }}>now</div>
        <div style={{ fontSize: 12, color: '#e5e5e5', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sessionUpdate.currentApp}
        </div>
        <AppBadge category={sessionUpdate.category} app={sessionUpdate.currentApp} />
      </div>

      {/* Metric chips */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '12px 16px' }}>
        <MetricChip label="switches" value={sessionUpdate.switchCount} />
        <MetricChip label="focus"    value={fmtDuration(sessionUpdate.focusSec)} color="teal" />
        <MetricChip label="drift"    value={fmtDuration(sessionUpdate.driftSec)} color={sessionUpdate.driftSec > 60 ? 'red' : undefined} />
      </div>

      {/* Activity feed */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '0 16px 12px' }}>
        <div style={{ fontSize: 9, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          recent activity
        </div>
        <div className="fg-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sessionUpdate.recentSwitches.length === 0 && (
            <div style={{ fontSize: 11, color: '#525252', fontStyle: 'italic' }}>no switches yet</div>
          )}
          {sessionUpdate.recentSwitches.slice(0, 5).map((sw, i) => {
            const useTitleForDisplay = sw.title && (sw.category === 'research' || sw.category === 'distraction' || sw.category === 'unknown');
            const rawLabel = useTitleForDisplay ? sw.title! : sw.app;
            const label = rawLabel.length > 34 ? rawLabel.slice(0, 34) + '…' : rawLabel;
            return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, opacity: 1 - i * 0.12 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: CATEGORY_DOT[sw.category] ?? '#737373', flexShrink: 0 }} />
              <div style={{ flex: 1, color: '#d4d4d4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', fontVariantNumeric: 'tabular-nums' }}>
                {new Date(sw.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ padding: '10px 16px 14px', borderTop: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6 }}>
        <button
          onClick={() => window.electronAPI.endSession()}
          style={{
            flex: 1,
            background: 'transparent',
            border: '0.5px solid rgba(248,113,113,0.3)',
            borderRadius: 5,
            padding: '8px 0',
            fontSize: 11,
            color: '#f87171',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          end session
        </button>
      </div>

      {/* Ghost mascot */}
      <div style={{
        position: 'absolute',
        bottom: 58,
        right: 12,
        pointerEvents: 'none',
        transition: 'opacity 0.3s',
      }}>
        <GhostMascot state={sessionUpdate.ghostState} size={40} />
      </div>
    </div>
  );
}
