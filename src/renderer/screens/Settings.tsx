import React from 'react';
import type { AppSettings } from '../../shared/ipc-contract';

interface Props {
  settings: AppSettings;
  onBack: () => void;
  onChange: (patch: Partial<AppSettings>) => void;
}

// ─── Exported icon — imported by other screens ───────────────────────────────

export function GearIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
      />
      <path
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}

// ─── Private helpers ─────────────────────────────────────────────────────────

function Toggle({ on, onChange, accent }: { on: boolean; onChange: (v: boolean) => void; accent: string }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 36, height: 20, borderRadius: 10,
        background: on ? accent : 'rgba(255,255,255,0.1)',
        border: 'none', cursor: 'pointer', position: 'relative',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: on ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
        boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
      }} />
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, color: '#737373', textTransform: 'uppercase',
      letterSpacing: '0.1em', marginBottom: 14, fontWeight: 500,
    }}>
      {children}
    </div>
  );
}

const ACCENT_COLORS: Record<AppSettings['accentColor'], string> = {
  teal:   '#2dd4bf',
  violet: '#a78bfa',
  amber:  '#facc15',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Settings({ settings, onBack, onChange }: Props) {
  const accent = ACCENT_COLORS[settings.accentColor] ?? '#2dd4bf';
  const thresholdMin = Math.max(1, Math.round(settings.inactivityThreshold / 60));

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', sans-serif", color: '#e5e5e5', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{ background: 'transparent', border: 'none', color: '#737373', fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 }}
        >
          ←
        </button>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#e5e5e5', letterSpacing: '-0.01em' }}>settings</div>
          <div style={{ fontSize: 10, color: '#737373' }}>tune your ghost</div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="fg-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>

        {/* ── APPEARANCE ─────────────────────────────────────────────────────── */}
        <SectionLabel>appearance</SectionLabel>

        {/* Accent color */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: '#e5e5e5', marginBottom: 8 }}>accent</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['teal', 'violet', 'amber'] as const).map(c => {
              const col = ACCENT_COLORS[c];
              const sel = settings.accentColor === c;
              return (
                <button
                  key={c}
                  onClick={() => onChange({ accentColor: c })}
                  style={{
                    flex: 1, background: sel ? `${col}18` : '#1a1a1a',
                    border: `0.5px solid ${sel ? col : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 5, padding: '7px 0', fontSize: 11,
                    color: sel ? col : '#737373', fontFamily: 'inherit',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Always on top */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: '#e5e5e5' }}>always on top</div>
            <div style={{ fontSize: 10, color: '#737373', marginTop: 2 }}>keep the window above other apps</div>
          </div>
          <Toggle on={settings.alwaysOnTop} onChange={v => onChange({ alwaysOnTop: v })} accent={accent} />
        </div>

        {/* Auto-collapse */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: '#e5e5e5' }}>auto-collapse when idle</div>
            <div style={{ fontSize: 10, color: '#737373', marginTop: 2 }}>shrink to bar after 30s of inactivity</div>
          </div>
          <Toggle on={settings.autoCollapse} onChange={v => onChange({ autoCollapse: v })} accent={accent} />
        </div>

        {/* Auto-dim */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: '#e5e5e5' }}>auto-dim when idle</div>
            <div style={{ fontSize: 10, color: '#737373', marginTop: 2 }}>fade window after 5s so you can see through it</div>
          </div>
          <Toggle on={settings.autoDim} onChange={v => onChange({ autoDim: v })} accent={accent} />
        </div>

        {/* Divider */}
        <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.06)', marginBottom: 18 }} />

        {/* ── NUDGES ─────────────────────────────────────────────────────────── */}
        <SectionLabel>nudges</SectionLabel>

        {/* Sensitivity */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: '#e5e5e5', marginBottom: 3 }}>sensitivity</div>
          <div style={{ fontSize: 10, color: '#737373', marginBottom: 8 }}>how quickly the ghost speaks up when you drift</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['gentle', 'balanced', 'strict'] as const).map(s => {
              const sel = settings.nudgeSensitivity === s;
              return (
                <button
                  key={s}
                  onClick={() => onChange({ nudgeSensitivity: s })}
                  style={{
                    flex: 1, background: sel ? 'rgba(255,255,255,0.06)' : '#1a1a1a',
                    border: `0.5px solid ${sel ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 5, padding: '7px 0', fontSize: 11,
                    color: sel ? accent : '#737373', fontFamily: 'inherit',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Inactivity timeout */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <div style={{ fontSize: 12, color: '#e5e5e5' }}>inactivity timeout</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: accent, fontVariantNumeric: 'tabular-nums' }}>
              {thresholdMin} min
            </div>
          </div>
          <div style={{ fontSize: 10, color: '#737373', marginBottom: 8 }}>marks you as inactive if no window changes for this long</div>
          <input
            type="range" min={1} max={10} value={thresholdMin}
            onChange={e => onChange({ inactivityThreshold: Number(e.target.value) * 60 })}
            style={{ width: '100%', accentColor: accent, cursor: 'pointer' }}
          />
        </div>

        {/* Nudges enabled */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: '#e5e5e5' }}>nudges</div>
            <div style={{ fontSize: 10, color: '#737373', marginTop: 2 }}>ghost speaks up when it detects distraction or drift</div>
          </div>
          <Toggle on={settings.nudgeEnabled} onChange={v => onChange({ nudgeEnabled: v })} accent={accent} />
        </div>
      </div>
    </div>
  );
}
