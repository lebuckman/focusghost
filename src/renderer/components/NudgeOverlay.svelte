<script lang="ts">
  import type { NudgePayload } from '../../shared/ipc-contract';

  interface Props {
    nudge: NudgePayload | null;
    onDismiss: (action: 'acknowledged' | 'break') => void;
    onOpenChat: () => void;
  }

  let { nudge, onDismiss, onOpenChat }: Props = $props();

  let borderColor = $derived(nudge?.urgent ? 'rgba(250,204,21,0.4)' : 'rgba(45,212,191,0.4)');
  let accentColor = $derived(nudge?.urgent ? '#facc15' : '#2dd4bf');
  let visible = $derived(!!nudge);

  function handleDismiss(action: 'acknowledged' | 'break') {
    onDismiss(action);
  }
</script>

<div
  class="nudge-overlay"
  style="border-top-color: {borderColor}; transform: translateY({visible ? '0' : '100%'});"
>
  <div class="nudge-content">
    <div class="accent-bar" style="background: {accentColor};"></div>
    <div class="message">{nudge?.message ?? ''}</div>
  </div>
  <div class="nudge-actions">
    <button class="btn-gotit" onclick={() => handleDismiss('acknowledged')}>
      got it
    </button>
    <button class="btn-stuck" onclick={() => { handleDismiss('acknowledged'); onOpenChat(); }}>
      i'm stuck
    </button>
  </div>
</div>

<style>
  .nudge-overlay {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    background: #1a1a1a;
    border-top: 0.5px solid;
    padding: 14px 16px;
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 -8px 24px rgba(0,0,0,0.4);
    z-index: 10;
  }
  .nudge-content {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    margin-bottom: 10px;
  }
  .accent-bar {
    width: 3px;
    align-self: stretch;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .message {
    flex: 1;
    font-size: 11px;
    color: #e5e5e5;
    line-height: 1.5;
  }
  .nudge-actions {
    display: flex;
    gap: 6px;
  }
  .btn-gotit, .btn-stuck {
    flex: 1;
    border-radius: 5px;
    padding: 7px 0;
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;
  }
  .btn-gotit {
    background: #111;
    border: 0.5px solid rgba(255,255,255,0.08);
    color: #a3a3a3;
  }
  .btn-stuck {
    background: transparent;
    border: 0.5px solid rgba(45,212,191,0.3);
    color: #2dd4bf;
  }
</style>