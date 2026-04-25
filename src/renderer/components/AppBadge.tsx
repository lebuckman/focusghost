import React from 'react';
import type { WindowCategory } from '../../shared/ipc-contract';

interface Props {
  category: WindowCategory;
  app: string;
}

const COLORS: Record<WindowCategory, { dot: string; fg: string; bg: string; label: string }> = {
  focus:       { dot: '#2dd4bf', fg: '#2dd4bf', bg: 'rgba(45,212,191,0.10)',   label: 'focus' },
  research:    { dot: '#60a5fa', fg: '#60a5fa', bg: 'rgba(96,165,250,0.10)',   label: 'research' },
  distraction: { dot: '#f87171', fg: '#f87171', bg: 'rgba(248,113,113,0.10)', label: 'distraction' },
  inactive:    { dot: '#737373', fg: '#a3a3a3', bg: 'rgba(115,115,115,0.12)', label: 'inactive' },
  unknown:     { dot: '#737373', fg: '#a3a3a3', bg: 'rgba(115,115,115,0.12)', label: 'unknown' },
};

export default function AppBadge({ category, app: _app }: Props) {
  const c = COLORS[category] ?? COLORS.unknown;
  return (
    <div
      style={{
        fontSize: 9,
        color: c.fg,
        background: c.bg,
        border: `0.5px solid ${c.fg}33`,
        padding: '2px 7px',
        borderRadius: 3,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontWeight: 500,
        flexShrink: 0,
      }}
    >
      {c.label}
    </div>
  );
}
