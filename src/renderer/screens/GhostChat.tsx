import { useEffect, useRef, useState } from 'react';
import GhostMascot from '../components/GhostMascot';
import { GearIcon } from './Settings';
import type { ChatEntry, GhostMessagePayload, ChatResponsePayload } from '../../shared/ipc-contract';
import { IPC } from '../../shared/ipc-contract';

interface Props {
  task: string;
  trigger?: string;
  prefillMessage?: string;
  onBack: () => void;
  onOpenSettings: () => void;
  onCollapse: () => void;
  accent: string;
}

function relativeTime(timestamp: number): string {
  const sec = Math.floor((Date.now() - timestamp) / 1000);
  if (sec < 60) return "just now";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function GhostChat({ task, trigger, prefillMessage, onBack, onOpenSettings, onCollapse, accent }: Props) {
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [input, setInput]             = useState('');
  const [isThinking, setIsThinking]   = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Track whether we've already shown the opening greeting
  const greeted = useRef(false);

  useEffect(() => {
    // Ghost greeting on first open — only once per mount
    if (!greeted.current) {
      greeted.current = true;
      const greeting: ChatEntry = {
        role: 'ghost',
        content: trigger === 'stuck'
          ? `looks like you might be stuck on "${task}" — what's blocking you? (syntax error, logic issue, or just not sure where to start?)`
          : `hey — i'm here while you work on "${task}". i'll stay quiet unless something changes.`,
        timestamp: Date.now(),
      };

      if (prefillMessage) {
        // Chip was tapped — add the chip text as the user's first message and auto-send it
        const userMsg: ChatEntry = { role: 'user', content: prefillMessage, timestamp: Date.now() + 1 };
        const initialHistory = [greeting, userMsg];
        setChatHistory(initialHistory);
        setIsThinking(true);
        window.electronAPI.sendChat({ message: prefillMessage, chatHistory: initialHistory });
      } else {
        setChatHistory([greeting]);
      }
    }

    window.electronAPI.onGhostMessage((d) => {
      const m = d as GhostMessagePayload;
      setChatHistory((h) => [
        ...h,
        { role: "ghost", content: m.message, timestamp: m.timestamp },
      ]);
    });
    window.electronAPI.onChatResponse((d) => {
      const r = d as ChatResponsePayload;
      setIsThinking(false);
      setChatHistory((h) => [
        ...h,
        { role: "ghost", content: r.message, timestamp: r.timestamp },
      ]);
    });

    return () => {
      window.electronAPI.removeAllListeners(IPC.GHOST_MESSAGE);
      window.electronAPI.removeAllListeners(IPC.CHAT_RESPONSE);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isThinking]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || isThinking) return;
    setInput("");
    const entry: ChatEntry = {
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    const next = [...chatHistory, entry];
    setChatHistory(next);
    setIsThinking(true);
    window.electronAPI.sendChat({ message: text, chatHistory: next });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "'Inter', sans-serif",
        color: "#e5e5e5",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "0.5px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          onClick={onBack}
          aria-label="back"
          style={{
            background: "transparent",
            border: "none",
            color: "#737373",
            fontSize: 14,
            cursor: "pointer",
            padding: 0,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ←
        </button>
        <GhostMascot state="calm" size={30} tint={accent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "#e5e5e5",
              letterSpacing: "-0.01em",
            }}
          >
            ghost companion
          </div>
          <div style={{ fontSize: 10, color: "#737373" }}>your focus buddy</div>
        </div>
        {/* Live indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 9,
            color: accent,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: accent,
              animation: "pulseDot 2s ease-in-out infinite",
            }}
          />
          live
        </div>
        {/* Collapse button */}
        <button
          onClick={onCollapse}
          title="collapse"
          style={{ background: 'transparent', border: 'none', padding: '0 0 0 4px', cursor: 'pointer', color: '#525252', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#a3a3a3')}
          onMouseLeave={e => (e.currentTarget.style.color = '#525252')}
          aria-label="collapse"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M4.5 2H2V4.5M8.5 2H11V4.5M4.5 11H2V8.5M8.5 11H11V8.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="settings"
          style={{ background: 'transparent', border: 'none', padding: '0 0 0 4px', cursor: 'pointer', color: '#525252', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#a3a3a3')}
          onMouseLeave={e => (e.currentTarget.style.color = '#525252')}
          aria-label="settings"
        >
          <GearIcon size={13} />
        </button>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="fg-scroll"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {trigger === 'stuck' && (
          <div style={{
            background: 'rgba(250,204,21,0.06)',
            border: '0.5px solid rgba(250,204,21,0.25)',
            borderRadius: 8,
            padding: '10px 12px',
          }}>
            <div style={{ fontSize: 10, color: '#facc15', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>
              ↳ stuck mode activated
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
              tell me what's snagging you and we'll work through it.
            </div>
          </div>
        )}
        {chatHistory.map((msg, i) =>
          msg.role === "user" ? (
            <UserBubble key={i} entry={msg} accent={accent} />
          ) : (
            <GhostBubble key={i} entry={msg} accent={accent} />
          ),
        )}
        {isThinking && <ThinkingBubble accent={accent} />}
      </div>

      {/* Composer */}
      <div
        style={{
          padding: "10px 12px 12px",
          borderTop: "0.5px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#1a1a1a",
            border: "0.5px solid rgba(255,255,255,0.08)",
            borderRadius: 18,
            padding: "4px 4px 4px 12px",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
            placeholder="chat with your ghost…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 11,
              color: "#e5e5e5",
              fontFamily: "inherit",
              padding: "6px 0",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isThinking}
            aria-label="send"
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: input.trim() && !isThinking ? accent : `${accent}26`,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: input.trim() && !isThinking ? "pointer" : "default",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M1.5 6L10.5 1.5L8 6L10.5 10.5L1.5 6Z"
                stroke={input.trim() && !isThinking ? "#0a0a0a" : accent}
                strokeWidth="1"
                strokeLinejoin="round"
                fill={input.trim() && !isThinking ? "#0a0a0a" : "none"}
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function GhostBubble({ entry, accent }: { entry: ChatEntry; accent: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        paddingRight: 20,
      }}
    >
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        <GhostMascot state="calm" size={22} tint={accent} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            background: "#1a1a1a",
            border: "0.5px solid rgba(255,255,255,0.06)",
            borderRadius: "2px 10px 10px 10px",
            padding: "7px 10px",
            fontSize: 11,
            color: "#d4d4d4",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {entry.content}
        </div>
        <div
          style={{
            fontSize: 9,
            color: "#525252",
            marginTop: 3,
            paddingLeft: 2,
          }}
        >
          {relativeTime(entry.timestamp)}
        </div>
      </div>
    </div>
  );
}

function UserBubble({ entry, accent }: { entry: ChatEntry; accent: string }) {
  return (
    <div
      style={{ display: "flex", justifyContent: "flex-end", paddingLeft: 32 }}
    >
      <div>
        <div
          style={{
            background: `${accent}1e`,
            border: `0.5px solid ${accent}4d`,
            borderRadius: "10px 10px 2px 10px",
            padding: "7px 10px",
            fontSize: 11,
            color: "#e5e5e5",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {entry.content}
        </div>
        <div
          style={{
            fontSize: 9,
            color: "#525252",
            marginTop: 3,
            textAlign: "right",
            paddingRight: 2,
          }}
        >
          {relativeTime(entry.timestamp)}
        </div>
      </div>
    </div>
  );
}

function ThinkingBubble({ accent }: { accent: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        <GhostMascot state="thinking" size={22} tint={accent} />
      </div>
      <div
        style={{
          background: "#1a1a1a",
          border: "0.5px solid rgba(255,255,255,0.06)",
          borderRadius: "2px 10px 10px 10px",
          padding: "10px 12px",
          display: "flex",
          gap: 3,
          alignItems: "center",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: accent,
              animation: `thinkDot 1.2s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
