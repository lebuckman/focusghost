import React, { useRef, useState } from 'react';
import GhostMascot from '../components/GhostMascot';
import { GearIcon } from './Settings';

interface Props {
  onStart: (task: string, durationMin: number) => void;
  onOpenSettings: () => void;
  accent: string;
}

const DURATIONS = [15, 30, 45, 60] as const;
const MIN_CUSTOM = 1;
const MAX_CUSTOM = 480;

export default function TaskDeclaration({ onStart, onOpenSettings, accent }: Props) {
  const [task,            setTask]           = useState('');
  const [duration,        setDuration]       = useState<number>(30);
  const [hoveredDuration, setHoveredDuration] = useState<number | null>(null);
  const [isCustom,        setIsCustom]        = useState(false);
  const [customFocused, setCustomFocused] = useState(false);
  const [customValue,   setCustomValue]   = useState('');
  const inputRef       = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const customMin   = parseInt(customValue, 10);
  const customValid = !isNaN(customMin) && customMin >= MIN_CUSTOM && customMin <= MAX_CUSTOM;

  const activeDuration = isCustom ? (customValid ? customMin : null) : duration;
  const canStart = task.trim().length > 0 && activeDuration !== null;

  const selectPreset = (d: number) => {
    setDuration(d);
    setIsCustom(false);
    setCustomValue('');
  };

  const handleStart = () => {
    if (!canStart) return;
    window.electronAPI.startSession({ task: task.trim(), durationMin: activeDuration! });
    onStart(task.trim(), activeDuration!);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleStart();
  };

  const handleCustomKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // only allow digits, backspace, delete, arrows
    if (!/[\d]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
      e.preventDefault();
    }
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
        onMouseEnter={(e) => { if (document.activeElement !== e.currentTarget) { e.currentTarget.style.background = '#222222'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; } }}
        onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; } }}
        onFocus={(e) => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.borderColor = `${accent}66`; }}
        onBlur={(e)  => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
      />

      {/* Duration label */}
      <div style={{ fontSize: 10, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        duration
      </div>

      {/* Preset duration pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        {DURATIONS.map((d) => {
          const sel = !isCustom && duration === d;
          return (
            <button
              key={d}
              onClick={() => selectPreset(d)}
              onMouseEnter={() => setHoveredDuration(d)}
              onMouseLeave={() => setHoveredDuration(null)}
              style={{
                flex: 1,
                background: sel ? `${accent}1e` : hoveredDuration === d ? `${accent}0f` : '#1a1a1a',
                border: `0.5px solid ${sel ? `${accent}80` : hoveredDuration === d ? `${accent}40` : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 6,
                padding: '8px 0',
                fontSize: 12,
                color: sel ? accent : hoveredDuration === d ? accent : '#a3a3a3',
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {d}m
            </button>
          );
        })}
      </div>

      {/* Custom pill — full width, inline editable */}
      <div
        style={{
          position: 'relative',
          background: isCustom ? `${accent}1e` : hoveredDuration === -1 ? `${accent}0f` : '#1a1a1a',
          border: `0.5px solid ${isCustom ? `${accent}80` : hoveredDuration === -1 ? `${accent}40` : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 6,
          padding: '8px 0',
          cursor: 'text',
          transition: 'all 0.15s',
          textAlign: 'center',
        }}
        onMouseEnter={() => setHoveredDuration(-1)}
        onMouseLeave={() => setHoveredDuration(null)}
        onClick={() => { setIsCustom(true); customInputRef.current?.focus(); }}
      >
        {/* Display layer */}
        <span style={{
          fontSize: 12,
          fontFamily: customValue ? "'JetBrains Mono', monospace" : 'inherit',
          color: customValue
            ? (customValid ? accent : '#f87171')
            : isCustom ? '#737373' : hoveredDuration === -1 ? accent : '#a3a3a3',
          pointerEvents: 'none',
          letterSpacing: customValue ? '0.02em' : undefined,
        }}>
          {!customValue && !customFocused && 'custom'}
          {customValue && customValue}
          {customFocused && (
            <span style={{
              display: 'inline-block',
              width: 1,
              height: '0.9em',
              background: customValid ? accent : customValue ? '#f87171' : '#737373',
              marginLeft: customValue ? 1 : 0,
              marginRight: customValue ? 1 : 0,
              verticalAlign: 'middle',
              animation: 'fgCursorBlink 1s step-end infinite',
            }} />
          )}
          {customValue && ' min'}
        </span>

        {/* Invisible input that captures keystrokes */}
        <input
          ref={customInputRef}
          type="text"
          inputMode="numeric"
          value={customValue}
          onChange={e => {
            const raw = e.target.value.replace(/\D/g, '').slice(0, 3);
            setCustomValue(raw);
          }}
          onKeyDown={handleCustomKey}
          onFocus={() => { setIsCustom(true); setCustomFocused(true); }}
          onBlur={() => setCustomFocused(false)}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            opacity: 0, cursor: 'text',
            border: 'none', background: 'transparent',
          }}
        />
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
