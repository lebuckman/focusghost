<script lang="ts">
  import GhostMascot from '../components/GhostMascot.svelte';
  import { startSession } from '../lib/electron';

  interface Props {
    onStart: (task: string, durationMin: number) => void;
  }

  let { onStart }: Props = $props();

  let task = $state('');
  let duration = $state(30);
  let inputRef: HTMLInputElement | null = $state(null);

  const DURATIONS = [15, 30, 45, 60] as const;

  let canStart = $derived(task.trim().length > 0);

  function handleStart() {
    if (!canStart) return;
    startSession(task.trim(), duration);
    onStart(task.trim(), duration);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleStart();
  }

  function handleFocus(e: FocusEvent) {
    const target = e.target as HTMLInputElement;
    target.style.borderColor = 'rgba(45,212,191,0.4)';
  }

  function handleBlur(e: FocusEvent) {
    const target = e.target as HTMLInputElement;
    target.style.borderColor = 'rgba(255,255,255,0.08)';
  }
</script>

<div class="declare-container">
  <div class="ghost-row">
    <GhostMascot state="calm" size={56} />
  </div>

  <div class="greeting">
    <div class="greeting-main">what are you working on?</div>
    <div class="greeting-sub">i'll keep you company</div>
  </div>

  <input
    bind:this={inputRef}
    autofocus
    type="text"
    bind:value={task}
    onkeydown={handleKeyDown}
    onfocus={handleFocus}
    onblur={handleBlur}
    placeholder="e.g. finish calc problem set"
    class="task-input"
  />

  <div class="duration-label">duration</div>

  <div class="duration-pills">
    {#each DURATIONS as d}
      <button
        class="duration-btn"
        class:active={duration === d}
        onclick={() => duration = d}
      >
        {d}m
      </button>
    {/each}
  </div>

  <div class="spacer"></div>

  <button
    class="start-btn"
    class:enabled={canStart}
    disabled={!canStart}
    onclick={handleStart}
  >
    start focus session
  </button>

  <div class="footer-hint">⏎ to start</div>
</div>

<style>
  .declare-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 32px 24px 24px;
    font-family: 'Inter', sans-serif;
    color: #e5e5e5;
    box-sizing: border-box;
  }
  .ghost-row {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
  }
  .greeting {
    text-align: center;
    margin-bottom: 28px;
  }
  .greeting-main {
    font-size: 15px;
    font-weight: 500;
    color: #e5e5e5;
    margin-bottom: 6px;
    letter-spacing: -0.01em;
  }
  .greeting-sub {
    font-size: 11px;
    color: #737373;
  }
  .task-input {
    width: 100%;
    background: #1a1a1a;
    border: 0.5px solid rgba(255,255,255,0.08);
    border-radius: 6px;
    padding: 10px 12px;
    font-size: 13px;
    color: #e5e5e5;
    font-family: inherit;
    outline: none;
    margin-bottom: 20px;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }
  .task-input::placeholder {
    color: #525252;
  }
  .duration-label {
    font-size: 10px;
    color: #737373;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
  }
  .duration-pills {
    display: flex;
    gap: 6px;
  }
  .duration-btn {
    flex: 1;
    background: #1a1a1a;
    border: 0.5px solid rgba(255,255,255,0.08);
    border-radius: 6px;
    padding: 8px 0;
    font-size: 12px;
    color: #a3a3a3;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
  }
  .duration-btn.active {
    background: rgba(45,212,191,0.12);
    border-color: rgba(45,212,191,0.5);
    color: #2dd4bf;
  }
  .spacer {
    flex: 1;
  }
  .start-btn {
    width: 100%;
    background: #1a1a1a;
    border: 0.5px solid rgba(255,255,255,0.08);
    border-radius: 6px;
    padding: 11px 0;
    font-size: 12px;
    font-weight: 600;
    color: #525252;
    font-family: inherit;
    cursor: not-allowed;
    letter-spacing: 0.02em;
    transition: all 0.15s;
    margin-bottom: 14px;
  }
  .start-btn.enabled {
    background: #2dd4bf;
    border-color: #2dd4bf;
    color: #0a0a0a;
    cursor: pointer;
  }
  .footer-hint {
    text-align: center;
    font-size: 10px;
    color: #525252;
  }
</style>