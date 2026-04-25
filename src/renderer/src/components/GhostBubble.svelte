<script lang="ts">
  import type { ChatEntry } from '@shared/ipc-contract';
  import GhostMascot from './GhostMascot.svelte';

  interface Props {
    entry: ChatEntry;
  }

  let { entry }: Props = $props();

  function relativeTime(timestamp: number): string {
    const sec = Math.floor((Date.now() - timestamp) / 1000);
    if (sec < 60) return 'just now';
    const m = Math.floor(sec / 60);
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  }
</script>

<div class="ghost-bubble-wrap">
  <GhostMascot state="calm" size={22} />
  <div class="ghost-bubble">
    <div class="bubble-text">{entry.content}</div>
    <div class="bubble-time">{relativeTime(entry.timestamp)}</div>
  </div>
</div>

<style>
  .ghost-bubble-wrap {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding-right: 20px;
  }
  .ghost-bubble {
    flex: 1;
    min-width: 0;
  }
  .bubble-text {
    background: #1a1a1a;
    border: 0.5px solid rgba(255,255,255,0.06);
    border-radius: 2px 10px 10px 10px;
    padding: 7px 10px;
    font-size: 11px;
    color: #d4d4d4;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .bubble-time {
    font-size: 9px;
    color: #525252;
    margin-top: 3px;
    padding-left: 2px;
  }
</style>