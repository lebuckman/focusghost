import { useEffect, useState } from 'react';
import GhostMascot from './GhostMascot';
import type { NudgePayload } from '../../shared/ipc-contract';

interface Props {
  nudge: NudgePayload;
  task: string;
  investedSec: number;
  remainingSec: number;
  onDismiss: () => void;
  onStuck: (reason?: string) => void;
  onEndSession: () => void;
  onSnooze?: () => void;
  onBlock?: () => void;
  accent?: string;
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function fmtMin(sec: number): string {
  return `${Math.floor(sec / 60)}m`;
}

function fmtCountdown(sec: number): string {
  const s = Math.max(0, sec);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// Window IS the card — PopupShell is a transparent pass-through.
// OS provides the rounded corners and frame; no fake chrome needed.
function PopupShell({ children, accent: _accent }: { accent?: string; children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', color: '#e5e5e5', fontFamily: "'Inter', sans-serif" }}>
      {children}
    </div>
  );
}

function Btn({ primary, accent = '#5dd8e6', onClick, children, style }: {
  primary?: boolean; accent?: string; onClick: () => void; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: primary ? accent : 'transparent',
        border: `1px solid ${primary ? accent : 'rgba(255,255,255,0.2)'}`,
        borderRadius: 8,
        height: 44,
        padding: '0 18px',
        fontSize: 14,
        fontWeight: 500,
        color: primary ? '#0a0a0a' : '#ffffff',
        fontFamily: 'inherit',
        cursor: 'pointer',
        letterSpacing: '0.01em',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── Popup variants ────────────────────────────────────────────────────────────

function DistractionFirm({ nudge, task, remainingSec, onDismiss, onStuck, onSnooze, accent }: Props) {
  const appName = nudge.context?.appName ?? 'that app';
  const taskLabel = task || nudge.context?.task || 'your task';
  const driftSec = nudge.context?.driftDurationSec ?? 0;
  const driftLabel = driftSec >= 60
    ? `${Math.floor(driftSec / 60)}m ${driftSec % 60}s`
    : `${driftSec}s`;

  return (
    <PopupShell accent="#f87171">
      <div style={{ padding: '32px 24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
          <div style={{ flexShrink: 0 }}>
            <GhostMascot state="concerned" size={72} tint={accent} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', boxShadow: '0 0 8px #f87171', display: 'inline-block' }} />
              distraction · {driftLabel}
            </div>
            <div style={{ fontSize: 22, color: '#ffffff', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em', marginBottom: 6 }}>
              {appName.toLowerCase()} again?
            </div>
            <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.4 }}>
              {nudge.message}
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(248,113,113,0.06)',
          borderLeft: '2px solid #f87171',
          borderRadius: '0 5px 5px 0',
          padding: '8px 14px',
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>you were working on</div>
            <div style={{ fontSize: 15, color: '#ffffff', fontWeight: 500 }}>{taskLabel}</div>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, color: '#5dd8e6', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            {fmtCountdown(remainingSec)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn onClick={onSnooze ?? onDismiss}>1 more min</Btn>
          <Btn onClick={onStuck}>i'm stuck</Btn>
          <Btn primary accent="#5dd8e6" onClick={onDismiss}>back to work</Btn>
        </div>
      </div>
    </PopupShell>
  );
}

function DistractionHard({ nudge, investedSec, remainingSec, onDismiss, onEndSession, accent }: Props) {
  const appName = nudge.context?.appName ?? 'that app';

  return (
    <PopupShell accent="#f87171">
      <div style={{ padding: '32px 24px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 20%, rgba(248,113,113,0.08), transparent 50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <GhostMascot state="concerned" size={72} tint={accent} />
            <div>
              <div style={{ fontSize: 11, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>hard interrupt</div>
              <div style={{ fontSize: 22, color: '#ffffff', fontWeight: 700, letterSpacing: '-0.02em' }}>hey — eyes on me.</div>
            </div>
          </div>

          <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.5, marginBottom: 16 }}>
            you opened <span style={{ color: '#f87171', fontWeight: 500 }}>{appName}</span> during your session.{' '}
            {nudge.message}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              { label: 'invested',  value: fmtMin(investedSec),  color: '#5dd8e6' },
              { label: 'remaining', value: fmtMin(remainingSec), color: '#e5e5e5' },
              { label: 'streak',    value: '—',                  color: '#facc15' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '8px 12px' }}>
                <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, color: s.color, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
            <Btn onClick={onEndSession} style={{ color: '#64748b', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13 }}>end session early</Btn>
            <Btn primary accent="#5dd8e6" onClick={onDismiss}>back to focus →</Btn>
          </div>
        </div>
      </div>
    </PopupShell>
  );
}

function StuckHelpful({ nudge, onDismiss, onStuck, accent }: Props) {
  const chips = ["don't know where to start", 'syntax/error', "logic isn't clicking", 'just thinking', "i'm fine"];
  return (
    <PopupShell accent="#facc15">
      <div style={{ padding: '32px 24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
          <GhostMascot state="thinking" size={72} tint={accent} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#facc15', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 6 }}>↳ checking in</div>
            <div style={{ fontSize: 22, color: '#ffffff', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em', marginBottom: 6 }}>stuck on something?</div>
            <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.4 }}>{nudge.message}</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>one tap to tell me which</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {chips.map(t => (
              <button
                key={t}
                onClick={() => onStuck(t)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 14,
                  padding: '6px 13px',
                  fontSize: 13,
                  color: '#d4d4d4',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}
              >{t}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn onClick={onDismiss}>not now</Btn>
          <Btn primary accent="#facc15" onClick={() => onStuck('chat_with_ghost')}>chat with ghost</Btn>
        </div>
      </div>
    </PopupShell>
  );
}

function IdleSoft({ nudge, onDismiss, onEndSession, accent }: Props) {
  const initialSec = nudge.context?.remainingSec ?? 120; // demo: 2min before auto-pause — restore to lower for production
  const [countdown, setCountdown] = useState(initialSec);
  useEffect(() => {
    setCountdown(nudge.context?.remainingSec ?? 120);
    const t = setInterval(() => setCountdown(c => {
      if (c <= 1) { clearInterval(t); onEndSession(); return 0; }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [nudge]);

  return (
    <PopupShell accent="#a3a3a3">
      <div style={{ padding: '48px 28px 44px', textAlign: 'center' }}>
        <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}>
          <GhostMascot state="sleepy" size={72} tint={accent} />
        </div>
        <div style={{ fontSize: 22, color: '#ffffff', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 8 }}>still there?</div>
        <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.5, marginBottom: 20, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
          {nudge.message}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <Btn onClick={onDismiss}>i'm taking a break</Btn>
          <Btn onClick={onEndSession}>end session</Btn>
          <Btn primary accent="#5dd8e6" onClick={onDismiss}>i'm back</Btn>
        </div>
        <div style={{ fontSize: 11, color: '#525252', letterSpacing: '0.04em' }}>
          auto-pausing in{' '}
          <span style={{ color: '#a3a3a3', fontFamily: "'JetBrains Mono', monospace" }}>
            {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
          </span>
        </div>
      </div>
    </PopupShell>
  );
}

function MilestonePositive({ nudge, onDismiss, accent }: Props) {
  return (
    <PopupShell accent="#5dd8e6">
      <div style={{ padding: '32px 24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          <GhostMascot state="happy" size={60} tint={accent} />
          <div>
            <div style={{ fontSize: 11, color: '#5dd8e6', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>milestone · 25 min</div>
            <div style={{ fontSize: 20, color: '#ffffff', fontWeight: 700, letterSpacing: '-0.01em' }}>deep focus reached.</div>
          </div>
        </div>
        <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.5, marginBottom: 16 }}>
          {nudge.message}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn onClick={onDismiss}>nice</Btn>
          <Btn primary accent="#5dd8e6" onClick={onDismiss}>keep going</Btn>
        </div>
      </div>
    </PopupShell>
  );
}

function PatternObservational({ nudge, onDismiss, onBlock, accent }: Props) {
  const appName = nudge.context?.appName ?? 'that app';
  const occurrences = nudge.context?.occurrences ?? 3;

  return (
    <PopupShell accent="#60a5fa">
      <div style={{ padding: '32px 24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
          <GhostMascot state="calm" size={52} tint={accent} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>pattern noticed</div>
            <div style={{ fontSize: 18, color: '#ffffff', fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
              {occurrences === 3 ? 'third' : `${occurrences}th`} time on {appName.toLowerCase()} in 10 minutes.
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(96,165,250,0.05)', border: '0.5px solid rgba(96,165,250,0.15)', borderRadius: 6, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>last 10 min</div>
          <div style={{ position: 'relative', height: 14 }}>
            <div style={{ position: 'absolute', top: 6, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            {[0.18, 0.52, 0.88].map((p, i) => (
              <div key={i} style={{
                position: 'absolute', left: `${p * 100}%`, top: 2,
                width: 10, height: 10, borderRadius: '50%',
                background: '#f87171', transform: 'translateX(-50%)',
                boxShadow: '0 0 6px rgba(248,113,113,0.6)',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#525252', fontFamily: "'JetBrains Mono', monospace", marginTop: 5 }}>
            <span>10m ago</span><span>now</span>
          </div>
        </div>

        <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.5, marginBottom: 14 }}>
          {nudge.message}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn onClick={onDismiss}>just notice it</Btn>
          <Btn primary accent="#60a5fa" onClick={onBlock ?? onDismiss}>
            block until {new Date(Date.now() + 30 * 60 * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </Btn>
        </div>
      </div>
    </PopupShell>
  );
}

// ── Root exports ──────────────────────────────────────────────────────────────

export function NudgeContent(props: Props) {
  switch (props.nudge.type) {
    case 'distraction-firm':      return <DistractionFirm      {...props} />;
    case 'distraction-hard':      return <DistractionHard      {...props} />;
    case 'stuck-helpful':         return <StuckHelpful         {...props} />;
    case 'idle-soft':             return <IdleSoft             {...props} />;
    case 'milestone-positive':    return <MilestonePositive    {...props} />;
    case 'pattern-observational': return <PatternObservational {...props} />;
    case 'in-app':
      console.warn('[NudgePopup] in-app nudge rendered as popup — should be inline only', props.nudge);
      return (
        <PopupShell>
          <div style={{ padding: '24px', fontSize: 14, color: '#d4d4d4', lineHeight: 1.5 }}>
            {props.nudge.message}
            <div style={{ marginTop: 12 }}><Btn onClick={props.onDismiss}>got it</Btn></div>
          </div>
        </PopupShell>
      );
    default:                      return null;
  }
}

export default function NudgePopup(props: Props) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0f1419', zIndex: 100, overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: '100%' }}>
        <NudgeContent {...props} />
      </div>
    </div>
  );
}
