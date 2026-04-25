import React from 'react';
import type { NudgePayload } from '../../shared/ipc-contract';

interface Props {
  nudge: NudgePayload | null;
  onDismiss: (action: 'acknowledged' | 'break') => void;
  onOpenChat: () => void;
}

export default function NudgeOverlay({ nudge, onDismiss, onOpenChat }: Props) {
  const borderColor = nudge?.urgent
    ? 'rgba(250,204,21,0.4)'
    : 'rgba(45,212,191,0.4)';
  const accentColor = nudge?.urgent ? '#facc15' : '#2dd4bf';

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        background: '#1a1a1a',
        borderTop: `0.5px solid ${borderColor}`,
        padding: '14px 16px',
        transform: nudge ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
        zIndex: 10,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
        <div
          style={{
            width: 3,
            alignSelf: 'stretch',
            background: accentColor,
            borderRadius: 2,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, fontSize: 11, color: '#e5e5e5', lineHeight: 1.5 }}>
          {nudge?.message ?? ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => onDismiss('acknowledged')}
          style={{
            flex: 1,
            background: '#111',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: 5,
            padding: '7px 0',
            fontSize: 11,
            color: '#a3a3a3',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          got it
        </button>
        <button
          onClick={() => { onDismiss('acknowledged'); onOpenChat(); }}
          style={{
            flex: 1,
            background: 'transparent',
            border: '0.5px solid rgba(45,212,191,0.3)',
            borderRadius: 5,
            padding: '7px 0',
            fontSize: 11,
            color: '#2dd4bf',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          i'm stuck
        </button>
      </div>
    </div>
  );
}
