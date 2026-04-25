<script lang="ts">
  import GhostMascot from '../components/GhostMascot.svelte';
  import type { SessionRecapPayload, WindowCategory } from '../../shared/ipc-contract';

  interface Props {
    recap: SessionRecapPayload;
    onNewSession: () => void;
  }

  let { recap, onNewSession }: Props = $props();

  function fmtDuration(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    return `${m}m`;
  }

  const CATEGORY_DOT: Record<WindowCategory, string> = {
    focus: '#2dd4bf',
    research: '#60a5fa',
    distraction: '#f87171',
    inactive: '#737373',
    unknown: '#737373',
  };

  let maxSec = $derived(Math.max(1, ...recap.appBreakdown.map((a) => a.seconds)));

  const metrics = $derived([
    { label: 'focus time', value: fmtDuration(recap.focusSec), color: '#2dd4bf' },
    { label: 'drift time', value: fmtDuration(recap.driftSec), color: '#f87171' },
    { label: 'switches', value: recap.totalSwitches, color: '#e5e5e5' },
    { label: 'nudges', value: recap.nudgesReceived, color: '#facc15' },
  ]);
</script>

<div class="recap-container">
  <div class="recap-header">
    <GhostMascot state="happy" size={32} />
    <div class="recap-title">
      <div class="title-label">session complete</div>
      <div class="title-task">{recap.task}</div>
    </div>
    <div class="recap-duration">{fmtDuration(recap.durationMin * 60)}</div>
  </div>

  <div class="recap-body fg-scroll">
    <div class="metrics-grid">
      {#each metrics as m}
        <div class="metric-card">
          <div class="metric-label">{m.label}</div>
          <div class="metric-value" style="color: {m.color};">{m.value}</div>
        </div>
      {/each}
    </div>

    <div class="apps-label">top apps</div>
    <div class="apps-list">
      {#each recap.appBreakdown.slice(0, 3) as a, i}
        {@const dot = CATEGORY_DOT[a.category] ?? '#737373'}
        {@const pct = a.seconds / maxSec}
        <div class="app-item">
          <div class="app-row">
            <div class="app-info">
              <div class="app-dot" style="background: {dot};"></div>
              <div class="app-name">{a.app}</div>
            </div>
            <div class="app-time">{fmtDuration(a.seconds)}</div>
          </div>
          <div class="app-bar">
            <div class="app-bar-fill" style="width: {pct * 100}%; background: {dot};"></div>
          </div>
        </div>
      {/each}
    </div>

    <div class="insight-card">
      <div class="insight-ghost">
        <GhostMascot state="calm" size={22} />
      </div>
      <div class="insight-content">
        <div class="insight-label">ghost insight</div>
        <div class="insight-text">{recap.insight}</div>
      </div>
    </div>
  </div>

  <div class="recap-footer">
    <button class="new-session-btn" onclick={onNewSession}>
      start new session
    </button>
  </div>
</div>

<style>
  .recap-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: 'Inter', sans-serif;
    color: #e5e5e5;
    overflow: hidden;
  }
  .recap-header {
    padding: 16px 16px 12px;
    border-bottom: 0.5px solid rgba(255,255,255,0.06);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .recap-title {
    flex: 1;
    min-width: 0;
  }
  .title-label {
    font-size: 9px;
    color: #737373;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 2px;
  }
  .title-task {
    font-size: 12px;
    font-weight: 500;
    color: #e5e5e5;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: -0.01em;
  }
  .recap-duration {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    color: #2dd4bf;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
  .recap-body {
    flex: 1;
    overflow-y: auto;
    padding: 14px 16px;
  }
  .metrics-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 16px;
  }
  .metric-card {
    background: #1a1a1a;
    border: 0.5px solid rgba(255,255,255,0.06);
    border-radius: 5px;
    padding: 10px 11px;
  }
  .metric-label {
    font-size: 9px;
    color: #737373;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 4px;
  }
  .metric-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .apps-label {
    font-size: 9px;
    color: #737373;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 10px;
  }
  .apps-list {
    display: flex;
    flex-direction: column;
    gap: 9px;
    margin-bottom: 16px;
  }
  .app-item {
  }
  .app-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 4px;
    font-size: 11px;
  }
  .app-info {
    display: flex;
    align-items: center;
    gap: 7px;
    overflow: hidden;
  }
  .app-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .app-name {
    color: #d4d4d4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .app-time {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #a3a3a3;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
    margin-left: 8px;
  }
  .app-bar {
    height: 3px;
    background: rgba(255,255,255,0.04);
    border-radius: 2px;
    overflow: hidden;
  }
  .app-bar-fill {
    height: 100%;
    opacity: 0.8;
    transition: width 0.6s ease-out;
  }
  .insight-card {
    background: #1a1a1a;
    border: 0.5px solid rgba(255,255,255,0.06);
    border-radius: 6px;
    padding: 10px 12px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .insight-ghost {
    flex-shrink: 0;
    margin-top: -2px;
  }
  .insight-content {
    flex: 1;
  }
  .insight-label {
    font-size: 9px;
    color: #a3a3a3;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 4px;
    font-weight: 500;
  }
  .insight-text {
    font-size: 11px;
    color: #d4d4d4;
    line-height: 1.55;
  }
  .recap-footer {
    padding: 10px 16px 14px;
    border-top: 0.5px solid rgba(255,255,255,0.06);
  }
  .new-session-btn {
    width: 100%;
    background: #2dd4bf;
    border: 0.5px solid #2dd4bf;
    border-radius: 5px;
    padding: 9px 0;
    font-size: 11px;
    font-weight: 600;
    color: #0a0a0a;
    font-family: inherit;
    cursor: pointer;
    letter-spacing: 0.02em;
  }
</style>