import React, { useRef, useState } from 'react';
import GhostMascot from '../components/GhostMascot';

interface Props {
  onStart: (task: string, durationMin: number) => void;
}

const DURATIONS = [15, 30, 45, 60] as const;

export default function TaskDeclaration({ onStart }: Props) {
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
      }}
    >
      {/* Ghost */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <GhostMascot state="calm" size={56} />
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
        onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(45,212,191,0.4)'; }}
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
              background: duration === d ? 'rgba(45,212,191,0.12)' : '#1a1a1a',
              border: `0.5px solid ${duration === d ? 'rgba(45,212,191,0.5)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: 6,
              padding: '8px 0',
              fontSize: 12,
              color: duration === d ? '#2dd4bf' : '#a3a3a3',
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
          background: canStart ? '#2dd4bf' : '#1a1a1a',
          border: `0.5px solid ${canStart ? '#2dd4bf' : 'rgba(255,255,255,0.08)'}`,
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
