import React, { useRef, useState } from 'react';
import GhostMascot from '../components/GhostMascot';
import { GearIcon } from './Settings';

interface Props {
  onStart: (task: string, durationMin: number) => void;
  onOpenSettings: () => void;
  accent: string;
}

const DURATIONS = [15, 30, 45, 60] as const;

export default function TaskDeclaration({ onStart, onOpenSettings, accent }: Props) {
  const [task, setTask] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const inputRef = useRef<HTMLInputElement>(null);

  const canStart = task.trim().length > 0;

  const handleStart = () => {
    if (!canStart) return;
    window.electronAPI.startSession({ task: task.trim(), durationMin: duration });
    onStart(task.trim(), duration);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleStart();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '32px 24px 24px',
        fontFamily: "'Inter', sans-serif",
        color: '#e5e5e5',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* Settings icon — top right */}
      <button
        onClick={onOpenSettings}
        title="settings"
        style={{ position: 'absolute', top: 10, right: 12, background: 'transparent', border: 'none', padding: 4, cursor: 'pointer', color: '#525252', display: 'flex', alignItems: 'center' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#a3a3a3')}
        onMouseLeave={e => (e.currentTarget.style.color = '#525252')}
        aria-label="settings"
      >
        <GearIcon size={14} />
      </button>

      {/* Ghost */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <GhostMascot state="calm" size={56} tint={accent} />
      </div>

      {/* Greeting */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#e5e5e5', marginBottom: 6, letterSpacing: '-0.01em' }}>
          what are you working on?
        </div>
        <div style={{ fontSize: 11, color: '#737373' }}>i'll keep you company</div>
      </div>

      {/* Task input */}
      <input
        ref={inputRef}
        autoFocus
        type="text"
        value={task}
        onChange={(e) => setTask(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g. finish calc problem set"
        style={{
          width: '100%',
          background: '#1a1a1a',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: 6,
          padding: '10px 12px',
          fontSize: 13,
          color: '#e5e5e5',
          fontFamily: 'inherit',
          outline: 'none',
          marginBottom: 20,
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = `${accent}66`; }}
        onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
      />

      {/* Duration label */}
      <div style={{ fontSize: 10, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        duration
      </div>

      {/* Duration pills */}
      <div style={{ display: 'flex', gap: 6 }}>
        {DURATIONS.map((d) => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            style={{
              flex: 1,
              background: duration === d ? `${accent}1e` : '#1a1a1a',
              border: `0.5px solid ${duration === d ? `${accent}80` : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 6,
              padding: '8px 0',
              fontSize: 12,
              color: duration === d ? accent : '#a3a3a3',
              fontFamily: 'inherit',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {d}m
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Start button */}
      <button
        disabled={!canStart}
        onClick={handleStart}
        style={{
          width: '100%',
          background: canStart ? accent : '#1a1a1a',
          border: `0.5px solid ${canStart ? accent : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 6,
          padding: '11px 0',
          fontSize: 12,
          fontWeight: 600,
          color: canStart ? '#0a0a0a' : '#525252',
          fontFamily: 'inherit',
          cursor: canStart ? 'pointer' : 'not-allowed',
          letterSpacing: '0.02em',
          transition: 'all 0.15s',
          marginBottom: 14,
        }}
      >
        start focus session
      </button>

      {/* Footer hint */}
      <div style={{ textAlign: 'center', fontSize: 10, color: '#525252' }}>⏎ to start</div>
    </div>
  );
}
