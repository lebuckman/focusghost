<script lang="ts">
  import { onMount } from 'svelte';
  import GhostMascot from '../components/GhostMascot.svelte';
  import { onGhostMessage, onChatResponse, sendChat } from '../lib/electron';
  import { chatHistory, isThinking } from '../stores/app';
  import type { ChatEntry, GhostMessagePayload, ChatResponsePayload } from '@shared/ipc-contract';
  import GhostBubble from '../components/GhostBubble.svelte';
  import UserBubble from '../components/UserBubble.svelte';
  import ThinkingBubble from '../components/ThinkingBubble.svelte';

  interface Props {
    onBack: () => void;
  }

  let { onBack }: Props = $props();

  // Initialize from store to get real data immediately on mount
  let messages = $state<ChatEntry[]>([...$chatHistory]);
  let input = $state('');
  let thinking = $state($isThinking);
  let scrollRef: HTMLDivElement | null = $state(null);

  // Keep in sync with store
  chatHistory.subscribe(h => messages = h);
  isThinking.subscribe(t => thinking = t);

  function handleSend() {
    const text = input.trim();
    if (!text || thinking) return;
    input = '';
    const entry: ChatEntry = { role: 'user', content: text, timestamp: Date.now() };
    const next = [...messages, entry];
    messages = next;
    chatHistory.set(next);
    thinking = true;
    isThinking.set(true);
    sendChat(text, next);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleSend();
  }

  onMount(() => {
    onGhostMessage((d: GhostMessagePayload) => {
      messages = [...messages, { role: 'ghost', content: d.message, timestamp: d.timestamp }];
      chatHistory.set(messages);
    });
    onChatResponse((d: ChatResponsePayload) => {
      thinking = false;
      isThinking.set(false);
      messages = [...messages, { role: 'ghost', content: d.message, timestamp: d.timestamp }];
      chatHistory.set(messages);
    });
  });

  $effect(() => {
    if (scrollRef && messages) {
      scrollRef.scrollTop = scrollRef.scrollHeight;
    }
  });
</script>

<div class="chat-container">
  <div class="chat-header">
    <button class="back-btn" onclick={onBack} aria-label="back">
      ←
    </button>
    <GhostMascot state="calm" size={30} />
    <div class="chat-title">
      <div class="title-main">ghost companion</div>
      <div class="title-sub">your focus buddy</div>
    </div>
    <div class="live-indicator">
      <div class="live-dot"></div>
      live
    </div>
  </div>

  <div class="message-list fg-scroll" bind:this={scrollRef}>
    {#each messages as msg}
      {#if msg.role === 'user'}
        <UserBubble entry={msg} />
      {:else}
        <GhostBubble entry={msg} />
      {/if}
    {/each}
    {#if thinking}
      <ThinkingBubble />
    {/if}
  </div>

  <div class="composer">
    <div class="composer-inner">
      <input
        type="text"
        bind:value={input}
        onkeydown={handleKeyDown}
        placeholder="chat with your ghost…"
        class="composer-input"
      />
      <button
        class="send-btn"
        class:enabled={input.trim() && !thinking}
        disabled={!input.trim() || thinking}
        aria-label="send"
        onclick={handleSend}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M1.5 6L10.5 1.5L8 6L10.5 10.5L1.5 6Z"
            stroke={input.trim() && !thinking ? '#0a0a0a' : '#2dd4bf'}
            stroke-width="1"
            stroke-linejoin="round"
            fill={input.trim() && !thinking ? '#0a0a0a' : 'none'}
          />
        </svg>
      </button>
    </div>
  </div>
</div>

<style>
  .chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: 'Inter', sans-serif;
    color: #e5e5e5;
    overflow: hidden;
  }
  .chat-header {
    padding: 12px 14px;
    border-bottom: 0.5px solid rgba(255,255,255,0.06);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .back-btn {
    background: transparent;
    border: none;
    color: #737373;
    font-size: 14;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    flex-shrink: 0;
  }
  .chat-title {
    flex: 1;
    min-width: 0;
  }
  .title-main {
    font-size: 12px;
    font-weight: 500;
    color: #e5e5e5;
    letter-spacing: -0.01em;
  }
  .title-sub {
    font-size: 10px;
    color: #737373;
  }
  .live-indicator {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 9px;
    color: #2dd4bf;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .live-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #2dd4bf;
    animation: pulseDot 2s ease-in-out infinite;
  }
  .message-list {
    flex: 1;
    overflow-y: auto;
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .composer {
    padding: 10px 12px 12px;
    border-top: 0.5px solid rgba(255,255,255,0.06);
  }
  .composer-inner {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #1a1a1a;
    border: 0.5px solid rgba(255,255,255,0.08);
    border-radius: 18px;
    padding: 4px 4px 4px 12px;
  }
  .composer-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 11px;
    color: #e5e5e5;
    font-family: inherit;
    padding: 6px 0;
  }
  .composer-input::placeholder {
    color: #525252;
  }
  .send-btn {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(45,212,191,0.15);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: default;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .send-btn.enabled {
    background: #2dd4bf;
    cursor: pointer;
  }
</style>