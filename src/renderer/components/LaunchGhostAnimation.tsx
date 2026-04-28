import React from 'react';
import GhostMascot from './GhostMascot';

interface Props {
  accent: string;
  size?: number;
}

export default function LaunchGhostAnimation({ accent, size = 56 }: Props) {
  const accentRgb = toRgbString(accent);
  const stageVars = {
    '--accent': accent,
    '--accent-rgb': accentRgb,
    '--accent-soft': `rgba(${accentRgb}, 0.18)`,
    '--accent-glow': `rgba(${accentRgb}, 0.32)`,
    '--ghost-size': `${size}px`,
  } as React.CSSProperties;

  return (
    <div className="ghost-stage" style={stageVars}>
      <div className="portal-container" aria-hidden="true">
        <div className="portal-ring" />
        <div className="portal-ring portal-ring-inner" />
        <div className="portal-glow" />
      </div>

      <div className="ghost-enter ghost-peek" aria-hidden="true">
        <div className="ghost-mask">
          <div className="ghost-mascot">
            <GhostMascot state="calm" size={size} tint={accent} animate={false} glow={false} showEyes={false} />
            <div className="ghost-eyes">
              <span className="ghost-eye" />
              <span className="ghost-eye" />
            </div>
            <div className="ghost-mouth" />
          </div>
        </div>
      </div>

      <div className="ghost-ripple" aria-hidden="true" />
      <div className="ghost-ripple ghost-ripple-glow" aria-hidden="true" />
    </div>
  );
}

function toRgbString(color: string): string {
  if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      return `${match[0]}, ${match[1]}, ${match[2]}`;
    }
  }
  if (color.startsWith('#')) {
    const hex = color.replace('#', '').trim();
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return `${r}, ${g}, ${b}`;
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `${r}, ${g}, ${b}`;
    }
  }
  return '45, 212, 191';
}
