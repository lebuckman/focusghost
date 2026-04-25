import React, { useEffect, useRef, useState } from 'react';
import GhostMascot from '../components/GhostMascot';
import type { ChatEntry, GhostMessagePayload, ChatResponsePayload } from '../../shared/ipc-contract';
import { MOCK_CHAT_HISTORY, IPC } from '../../shared/ipc-contract';

interface Props {
  onBack: () => void;
}

function relativeTime(timestamp: number): string {
  const sec = Math.floor((Date.now() - timestamp) / 1000);
  if (sec < 60) return 'just now';
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function GhostChat({ onBack }: Props) {
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>(MOCK_CHAT_HISTORY);
  const [input, setInput]             = useState('');
  const [isThinking, setIsThinking]   = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.electronAPI.onGhostMessage((d) => {
      const m = d as GhostMessagePayload;
      setChatHistory((h) => [...h, { role: 'ghost', content: m.message, timestamp: m.timestamp }]);
    });
    window.electronAPI.onChatResponse((d) => {
      const r = d as ChatResponsePayload;
      setIsThinking(false);
      setChatHistory((h) => [...h, { role: 'ghost', content: r.message, timestamp: r.timestamp }]);
    });

    return () => {
      window.electronAPI.removeAllListeners(IPC.GHOST_MESSAGE);
      window.electronAPI.removeAllListeners(IPC.CHAT_RESPONSE);
    };
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isThinking]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || isThinking) return;
    setInput('');
    const entry: ChatEntry = { role: 'user', content: text, timestamp: Date.now() };
    const next = [...chatHistory, entry];
    setChatHistory(next);
    setIsThinking(true);
    window.electronAPI.sendChat({ message: text, chatHistory: next });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Inter', sans-serif", color: '#e5e5e5', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={onBack}
          aria-label="back"
          style={{ background: 'transparent', border: 'none', color: '#737373', fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 }}
        >
          ←
        </button>
        <GhostMascot state="calm" size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#e5e5e5', letterSpacing: '-0.01em' }}>ghost companion</div>
          <div style={{ fontSize: 10, color: '#737373' }}>your focus buddy</div>
        </div>
        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: '#2dd4bf', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#2dd4bf', animation: 'pulseDot 2s ease-in-out infinite' }} />
          live
        </div>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="fg-scroll"
        style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        {chatHistory.map((msg, i) =>
          msg.role === 'user' ? (
            <UserBubble key={i} entry={msg} />
          ) : (
            <GhostBubble key={i} entry={msg} />
          )
        )}
        {isThinking && <ThinkingBubble />}
      </div>

      {/* Composer */}
      <div style={{ padding: '10px 12px 12px', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#1a1a1a',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          padding: '4px 4px 4px 12px',
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="chat with your ghost…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 11,
              color: '#e5e5e5',
              fontFamily: 'inherit',
              padding: '6px 0',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isThinking}
            aria-label="send"
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: input.trim() && !isThinking ? '#2dd4bf' : 'rgba(45,212,191,0.15)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() && !isThinking ? 'pointer' : 'default',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M1.5 6L10.5 1.5L8 6L10.5 10.5L1.5 6Z"
                stroke={input.trim() && !isThinking ? '#0a0a0a' : '#2dd4bf'}
                strokeWidth="1"
                strokeLinejoin="round"
                fill={input.trim() && !isThinking ? '#0a0a0a' : 'none'}
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function GhostBubble({ entry }: { entry: ChatEntry }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingRight: 20 }}>
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        <GhostMascot state="calm" size={22} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          background: '#1a1a1a',
          border: '0.5px solid rgba(255,255,255,0.06)',
          borderRadius: '2px 10px 10px 10px',
          padding: '7px 10px',
          fontSize: 11,
          color: '#d4d4d4',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {entry.content}
        </div>
        <div style={{ fontSize: 9, color: '#525252', marginTop: 3, paddingLeft: 2 }}>
          {relativeTime(entry.timestamp)}
        </div>
      </div>
    </div>
  );
}

function UserBubble({ entry }: { entry: ChatEntry }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingLeft: 32 }}>
      <div>
        <div style={{
          background: 'rgba(45,212,191,0.12)',
          border: '0.5px solid rgba(45,212,191,0.3)',
          borderRadius: '10px 10px 2px 10px',
          padding: '7px 10px',
          fontSize: 11,
          color: '#e5e5e5',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {entry.content}
        </div>
        <div style={{ fontSize: 9, color: '#525252', marginTop: 3, textAlign: 'right', paddingRight: 2 }}>
          {relativeTime(entry.timestamp)}
        </div>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        <GhostMascot state="thinking" size={22} />
      </div>
      <div style={{
        background: '#1a1a1a',
        border: '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: '2px 10px 10px 10px',
        padding: '10px 12px',
        display: 'flex',
        gap: 3,
        alignItems: 'center',
      }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              background: '#2dd4bf',
              animation: `thinkDot 1.2s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
