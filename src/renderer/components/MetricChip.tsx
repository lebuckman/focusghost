import React from 'react';

interface Props {
  label: string;
  value: string | number;
  color?: 'teal' | 'red' | 'amber';
}

const VALUE_COLOR: Record<string, string> = {
  teal:  '#2dd4bf',
  red:   '#f87171',
  amber: '#facc15',
};

export default function MetricChip({ label, value, color }: Props) {
  const valueColor = color ? VALUE_COLOR[color] : '#e5e5e5';
  return (
    <div
      style={{
        background: '#1a1a1a',
        border: '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: 5,
        padding: '8px 9px',
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: '#737373',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          color: valueColor,
          fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  );
}
