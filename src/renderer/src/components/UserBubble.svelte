<script lang="ts">
  import type { ChatEntry } from '@shared/ipc-contract';

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

<div class="user-bubble-wrap">
  <div class="user-bubble">
    <div class="bubble-text">{entry.content}</div>
    <div class="bubble-time">{relativeTime(entry.timestamp)}</div>
  </div>
</div>

<style>
  .user-bubble-wrap {
    display: flex;
    justify-content: flex-end;
    padding-left: 32px;
  }
  .user-bubble {
    min-width: 0;
  }
  .bubble-text {
    background: rgba(45,212,191,0.12);
    border: 0.5px solid rgba(45,212,191,0.3);
    border-radius: 10px 10px 2px 10px;
    padding: 7px 10px;
    font-size: 11px;
    color: #e5e5e5;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .bubble-time {
    font-size: 9px;
    color: #525252;
    margin-top: 3px;
    text-align: right;
    padding-right: 2px;
  }
</style>