<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import GhostMascot from '../components/GhostMascot.svelte';
  import AppBadge from '../components/AppBadge.svelte';
  import MetricChip from '../components/MetricChip.svelte';
  import NudgeOverlay from '../components/NudgeOverlay.svelte';
  import { onSessionUpdate, onNudge, onOpenGhostChat, onSessionRecap, endSession, dismissNudge, cleanupAllListeners } from '../lib/electron';
  import { sessionUpdate, nudge } from '../stores/app';
  import type { SessionUpdate, SessionRecapPayload, NudgePayload, WindowCategory } from '@shared/ipc-contract';

  interface Props {
    task: string;
    durationMin: number;
    onOpenChat: () => void;
    onRecap: (data: SessionRecapPayload) => void;
  }

  let { task, durationMin, onOpenChat, onRecap }: Props = $props();

  // Initialize from store to get real data immediately on mount
  let session = $state<SessionUpdate>({...$sessionUpdate});
  let currentNudge = $state<NudgePayload | null>($nudge);

  // Keep in sync with store
  sessionUpdate.subscribe(s => session = s);
  nudge.subscribe(n => currentNudge = n);

  function fmtCountdown(sec: number): string {
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

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

  let durationSec = $derived(durationMin * 60);
  let remaining = $derived(Math.max(0, durationSec - session.elapsedSec));
  let progress = $derived(Math.min(1, session.elapsedSec / Math.max(1, durationSec)));

  function handleDismiss(action: 'acknowledged' | 'break') {
    dismissNudge();
    currentNudge = null;
  }

  onMount(() => {
    onSessionUpdate((data: SessionUpdate) => {
      session = data;
      sessionUpdate.set(data);
    });
    onOpenGhostChat(() => {
      onOpenChat();
    });
    onSessionRecap((data: SessionRecapPayload) => {
      onRecap(data);
    });
    onNudge((data: NudgePayload) => {
      currentNudge = data;
      nudge.set(data);
    });
  });

  function handleEndSession() {
    endSession();
  }
</script>

<div class="session-container">
  <div class="header">
    <div class="task-row">
      <div class="task-name">{task}</div>
      <div class="countdown">{fmtCountdown(remaining)}</div>
      <div class="chat-btn-container">
        <button class="icon-btn" onclick={onOpenChat} title="chat" aria-label="chat">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1.5 3.5 Q 1.5 2, 3 2 H 9 Q 10.5 2, 10.5 3.5 V 6.5 Q 10.5 8, 9 8 H 5 L 3 10 V 8 Q 1.5 8, 1.5 6.5 Z"
              stroke="currentColor" stroke-width="0.9" stroke-linejoin="round" fill="none" />
          </svg>
        </button>
      </div>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: {progress * 100}%;"></div>
    </div>
  </div>

  <div class="current-app-row">
    <div class="app-label">now</div>
    <div class="app-name">{session.currentApp}</div>
    <AppBadge category={session.category} app={session.currentApp} />
  </div>

  <div class="metrics-row">
    <MetricChip label="switches" value={session.switchCount} />
    <MetricChip label="focus" value={fmtDuration(session.focusSec)} color="teal" />
    <MetricChip label="drift" value={fmtDuration(session.driftSec)} color={session.driftSec > 60 ? 'red' : undefined} />
  </div>

  <div class="activity-section">
    <div class="activity-label">recent activity</div>
    <div class="activity-list fg-scroll">
      {#if session.recentSwitches.length === 0}
        <div class="no-switches">no switches yet</div>
      {:else}
        {#each session.recentSwitches.slice(0, 5) as sw, i}
          <div class="activity-item" style="opacity: {1 - i * 0.12};">
            <div class="activity-dot" style="background: {CATEGORY_DOT[sw.category] ?? '#737373'};"></div>
            <div class="activity-app">{sw.app}</div>
            <div class="activity-time">{new Date(sw.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <div class="bottom-bar">
    <button class="end-session-btn" onclick={handleEndSession}>
      end session
    </button>
  </div>

  <div class="ghost-position" class:dimmed={currentNudge}>
    <GhostMascot state={session.ghostState} size={40} />
  </div>

  <NudgeOverlay nudge={currentNudge} onDismiss={handleDismiss} onOpenChat={onOpenChat} />
</div>

<style>
  .session-container {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: 'Inter', sans-serif;
    color: #e5e5e5;
    overflow: hidden;
  }
  .header {
    padding: 14px 16px 12px;
    border-bottom: 0.5px solid rgba(255,255,255,0.06);
  }
  .task-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 6px;
    gap: 8px;
  }
  .task-name {
    font-size: 12px;
    color: #e5e5e5;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
    letter-spacing: -0.01em;
  }
  .countdown {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: #2dd4bf;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .chat-btn-container {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
    margin-left: 2px;
  }
  .icon-btn {
    background: transparent;
    border: none;
    width: 22px;
    height: 22px;
    padding: 0;
    border-radius: 4px;
    cursor: pointer;
    color: #737373;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .progress-bar {
    height: 2px;
    background: rgba(255,255,255,0.05);
    border-radius: 1px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: #2dd4bf;
    transition: width 0.5s linear;
  }
  .current-app-row {
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 0.5px solid rgba(255,255,255,0.06);
  }
  .app-label {
    font-size: 10px;
    color: #737373;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .app-name {
    font-size: 12px;
    color: #e5e5e5;
    font-weight: 500;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .metrics-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px;
    padding: 12px 16px;
  }
  .activity-section {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 0 16px 12px;
  }
  .activity-label {
    font-size: 9px;
    color: #737373;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
  }
  .activity-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .no-switches {
    font-size: 11px;
    color: #525252;
    font-style: italic;
  }
  .activity-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
  }
  .activity-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .activity-app {
    flex: 1;
    color: #d4d4d4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .activity-time {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #737373;
    font-variant-numeric: tabular-nums;
  }
  .bottom-bar {
    padding: 10px 16px 14px;
    border-top: 0.5px solid rgba(255,255,255,0.06);
    display: flex;
    gap: 6px;
  }
  .end-session-btn {
    flex: 1;
    background: transparent;
    border: 0.5px solid rgba(248,113,113,0.3);
    border-radius: 5px;
    padding: 8px 0;
    font-size: 11px;
    color: #f87171;
    font-family: inherit;
    cursor: pointer;
  }
  .ghost-position {
    position: absolute;
    bottom: 58px;
    right: 12px;
    pointer-events: none;
    opacity: 1;
    transition: opacity 0.3s;
  }
  .ghost-position.dimmed {
    opacity: 0.3;
  }
</style>