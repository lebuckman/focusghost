<script lang="ts">
  import { onMount } from 'svelte';
  import GhostMascot from '../components/GhostMascot.svelte';
  import { onSessionUpdate } from '../lib/electron';
  import { sessionUpdate } from '../stores/app';
  import type { SessionUpdate } from '../../shared/ipc-contract';

  interface Props {
    task: string;
    onExpand: () => void;
    onSettings: () => void;
  }

  let { task, onExpand, onSettings }: Props = $props();

  let session = $state<SessionUpdate | null>($sessionUpdate);
  let remaining = $state(0);
  let durationSec = 30 * 60;

  sessionUpdate.subscribe((s) => {
    session = s;
    if (s) {
      remaining = Math.max(0, durationSec - s.elapsedSec);
    }
  });

  function fmtCountdown(sec: number): string {
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

  function fmtAppName(name: string): string {
    if (name.length > 12) return name.substring(0, 12) + '…';
    return name;
  }

  onMount(() => {
    onSessionUpdate((data: SessionUpdate) => {
      session = data;
      sessionUpdate.set(data);
    });
  });
</script>

<div class="collapsed-bar">
  <button class="expand-btn" onclick={onExpand} title="expand">
    <GhostMascot state={session?.ghostState || 'calm'} size={24} />
  </button>

  <div class="bar-content">
    <div class="task-info">
      <span class="task-label">{task.length > 20 ? task.substring(0, 20) + '…' : task}</span>
      {#if session}
        <span class="app-name" style="color: {session.category === 'distraction' ? '#f87171' : '#2dd4bf'}">
          {fmtAppName(session.currentApp)}
        </span>
      {/if}
    </div>

    <div class="timer">{fmtCountdown(remaining)}</div>
  </div>

  <button class="settings-btn" onclick={onSettings} title="settings" aria-label="settings">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="1.5" fill="currentColor" />
      <circle cx="7" cy="2" r="0.8" fill="currentColor" />
      <circle cx="7" cy="12" r="0.8" fill="currentColor" />
      <line x1="7" y1="3.5" x2="7" y2="5.5" stroke="currentColor" stroke-width="0.5" />
      <line x1="7" y1="8.5" x2="7" y2="10.5" stroke="currentColor" stroke-width="0.5" />
    </svg>
  </button>
</div>

<style>
  .collapsed-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 36px;
    padding: 0 8px;
    background: #111111;
    border-bottom: 0.5px solid rgba(255, 255, 255, 0.06);
    font-family: 'Inter', sans-serif;
    color: #e5e5e5;
  }

  .expand-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .bar-content {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .task-info {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .task-label {
    font-size: 10px;
    color: #a3a3a3;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .app-name {
    font-size: 9px;
    font-family: 'JetBrains Mono', monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .timer {
    font-size: 11px;
    font-weight: 500;
    font-family: 'JetBrains Mono', monospace;
    color: #2dd4bf;
    flex-shrink: 0;
  }

  .settings-btn {
    background: transparent;
    border: none;
    color: #737373;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .settings-btn:hover {
    color: #a3a3a3;
  }
</style>
