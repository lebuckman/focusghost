import React, { useEffect, useRef, useState } from "react";
import TaskDeclaration from "./screens/TaskDeclaration";
import ActiveSession from "./screens/ActiveSession";
import GhostChat from "./screens/GhostChat";
import SessionRecap from "./screens/SessionRecap";
import Settings from "./screens/Settings";
import NudgePopup from "./components/NudgePopup";
import NudgeView from "./screens/NudgeView";
import type {
  SessionRecapPayload,
  NudgePayload,
  SessionUpdate,
  OpenGhostChatPayload,
  AppSettings,
} from "../shared/ipc-contract";
import { IPC, DEFAULT_SETTINGS } from "../shared/ipc-contract";
import {
  isAppSettings,
  isNudgePayload,
  isSessionRecapPayload,
  isSessionUpdate,
} from "../shared/ipc-validators";

const isOpenGhostChatPayload = (
  value: unknown,
): value is OpenGhostChatPayload => {
  if (typeof value !== "object" || value === null) return false;

  const payload = value as Record<string, unknown>;
  return (
    typeof payload.trigger === "string" &&
    (payload.prefillMessage === undefined ||
      typeof payload.prefillMessage === "string")
  );
};

const isNudgeView =
  new URLSearchParams(window.location.search).get("view") === "nudge";
const isWindows = window.electronAPI.platform === "win32";

const ACCENT_MAP: Record<AppSettings["accentColor"], string> = {
  teal: "#2dd4bf",
  violet: "#a78bfa",
  amber: "#facc15",
};

// ─── Custom frameless title bar ───────────────────────────────────────────────

function TitleBar({ alwaysOnTop }: { alwaysOnTop: boolean }) {
  const drag = { WebkitAppRegion: "drag" } as React.CSSProperties;
  const noDrag = { WebkitAppRegion: "no-drag" } as React.CSSProperties;
  return (
    <div
      style={{
        height: 30,
        background: "#111111",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        paddingLeft: isWindows ? 12 : 65,
        paddingRight: isWindows ? 0 : 20,
        position: "relative",
        ...drag,
      }}
    >
      <span
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 10,
          color: "#737373",
          fontWeight: 500,
          letterSpacing: "0.04em",
          ...noDrag,
        }}
      >
        focusghost
      </span>
      {/* macOS: pinned indicator sits on the right, traffic lights handle close/min */}
      {!isWindows && alwaysOnTop && (
        <span
          style={{
            fontSize: 9,
            color: "#525252",
            letterSpacing: "0.04em",
            marginLeft: "auto",
          }}
        >
          ◉ pinned
        </span>
      )}
      {/* Windows: pinned indicator + close/minimize buttons */}
      {isWindows && (
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            height: "100%",
            ...noDrag,
          }}
        >
          {alwaysOnTop && (
            <span
              style={{
                fontSize: 9,
                color: "#525252",
                letterSpacing: "0.04em",
                marginRight: 8,
              }}
            >
              ◉ pinned
            </span>
          )}
          <button
            onClick={() => window.electronAPI.minimizeWindow()}
            style={{
              width: 46,
              height: 30,
              background: "transparent",
              border: "none",
              color: "#737373",
              fontSize: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            &#x2013;
          </button>
          <button
            onClick={() => window.electronAPI.closeWindow()}
            style={{
              width: 46,
              height: 30,
              background: "transparent",
              border: "none",
              color: "#737373",
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            &#x2715;
          </button>
        </div>
      )}
    </div>
  );
}

type Screen = "declare" | "session" | "chat" | "recap" | "settings";

export default function App() {
  const [screen, setScreen] = useState<Screen>("declare");
  const [prevScreen, setPrevScreen] = useState<Screen>("declare");
  const [recap, setRecap] = useState<SessionRecapPayload | null>(null);
  const [activeTask, setActiveTask] = useState("");
  const [activeMins, setActiveMins] = useState(30);
  const [nudge, setNudge] = useState<NudgePayload | null>(null);
  const [chatTrigger, setChatTrigger] = useState<string | undefined>(undefined);
  const [chatPrefill, setChatPrefill] = useState<string | undefined>(undefined);
  const [settings, setSettings] = useState<AppSettings>({
    ...DEFAULT_SETTINGS,
  });
  const [collapsed, setCollapsed] = useState(false);
  const dimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDimRef = useRef(settings.autoDim);

  const clearDimTimer = () => {
    if (dimTimer.current) {
      clearTimeout(dimTimer.current);
      dimTimer.current = null;
    }
  };
  const startDimTimer = () => {
    clearDimTimer();
    dimTimer.current = setTimeout(() => {
      if (autoDimRef.current) window.electronAPI.setWindowDim(true);
    }, 5000);
  };
  const [sessionUpdate, setSessionUpdate] = useState<SessionUpdate>({
    currentApp: "",
    currentAppProcess: "",
    currentAppBundle: "",
    currentAppTitle: "",
    category: "unknown",
    switchCount: 0,
    elapsedSec: 0,
    focusSec: 0,
    driftSec: 0,
    ghostState: "calm",
    recentSwitches: [],
  });

  const accent = ACCENT_MAP[settings.accentColor] ?? "#2dd4bf";

  // ── Window collapse/expand ────────────────────────────────────────────────────
  const collapse = () => {
    setCollapsed(true);
    window.electronAPI.collapseWindow();
  };
  const expand = () => {
    setCollapsed(false);
    window.electronAPI.expandWindow();
  };

  // Keep ref in sync so event-handler closures always see the current value
  useEffect(() => {
    autoDimRef.current = settings.autoDim;
  }, [settings.autoDim]);

  // ── Auto-dim: make window see-through after 5s of no interaction ─────────────
  useEffect(() => {
    if (isNudgeView) return;

    const restore = () => {
      if (autoDimRef.current) window.electronAPI.setWindowDim(false);
      startDimTimer();
    };

    startDimTimer();
    window.addEventListener("mousemove", restore);
    window.addEventListener("mousedown", restore);
    window.addEventListener("keydown", restore);
    document.addEventListener("mouseenter", restore); // fires on cursor entering the window boundary
    return () => {
      clearDimTimer();
      window.removeEventListener("mousemove", restore);
      window.removeEventListener("mousedown", restore);
      window.removeEventListener("keydown", restore);
      document.removeEventListener("mouseenter", restore);
    };
  }, []);

  // When autoDim is toggled off, immediately restore the window
  useEffect(() => {
    if (isNudgeView || settings.autoDim) return;
    window.electronAPI.setWindowDim(false);
  }, [settings.autoDim]);

  // Force restore on nudge or recap; restart dim timer after
  useEffect(() => {
    if (!nudge && screen !== "recap") return;
    window.electronAPI.setWindowDim(false);
    startDimTimer();
    return () => {
      clearDimTimer();
    };
  }, [nudge, screen]);

  // ── Load persisted settings on mount ─────────────────────────────────────────
  useEffect(() => {
    if (isNudgeView) return;
    window.electronAPI.getSettings().then((s) => {
      if (!isAppSettings(s)) {
        console.warn("[electronAPI] Ignored invalid GET_SETTINGS payload");
        return;
      }

      setSettings((prev) => ({ ...prev, ...s }));
    });
  }, []);

  // ── IPC listeners ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isNudgeView) return;
    window.electronAPI.onNudge((d) => {
      if (!isNudgePayload(d)) {
        console.warn("[electronAPI] Ignored invalid TRIGGER_NUDGE payload");
        return;
      }

      setNudge(d);
    });
    window.electronAPI.onNudgeDismissed(() => setNudge(null));
    window.electronAPI.onOpenGhostChat((d) => {
      if (!isOpenGhostChatPayload(d)) {
        console.warn("[electronAPI] Ignored invalid OPEN_GHOST_CHAT payload");
        return;
      }

      const payload = d;
      setChatTrigger(payload?.trigger);
      setChatPrefill(payload?.prefillMessage);
      setScreen("chat");
      // Always expand so the chat screen renders in the full window
      setCollapsed(false);
      window.electronAPI.expandWindow();
    });
    window.electronAPI.onSessionUpdate((d) => {
      if (!isSessionUpdate(d)) {
        console.warn("[electronAPI] Ignored invalid SESSION_UPDATE payload");
        return;
      }

      setSessionUpdate(d);
    });
    window.electronAPI.onSessionRecap((d) => {
      if (!isSessionRecapPayload(d)) {
        console.warn("[electronAPI] Ignored invalid SESSION_RECAP payload");
        return;
      }

      setRecap(d);
      setScreen("recap");
      setCollapsed(false);
      window.electronAPI.expandWindow();
    });
    return () => {
      window.electronAPI.removeAllListeners(IPC.TRIGGER_NUDGE);
      window.electronAPI.removeAllListeners(IPC.NUDGE_DISMISSED);
      window.electronAPI.removeAllListeners(IPC.OPEN_GHOST_CHAT);
      window.electronAPI.removeAllListeners(IPC.SESSION_UPDATE);
      window.electronAPI.removeAllListeners(IPC.SESSION_RECAP);
    };
  }, []);

  // ── Auto-collapse: collapse after 30s of no user interaction with the app ────
  const autoCollapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!settings.autoCollapse || screen !== "session" || collapsed) return;

    const resetTimer = () => {
      if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current);
      autoCollapseTimer.current = setTimeout(() => collapse(), 30_000);
    };

    resetTimer();
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("mousedown", resetTimer);
    window.addEventListener("keydown", resetTimer);
    return () => {
      if (autoCollapseTimer.current) clearTimeout(autoCollapseTimer.current);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("mousedown", resetTimer);
      window.removeEventListener("keydown", resetTimer);
    };
  }, [settings.autoCollapse, screen, collapsed]);

  // ── Navigation helpers ────────────────────────────────────────────────────────
  const dismissNudge = () => {
    window.electronAPI.dismissNudge();
    setNudge(null);
  };

  const openChat = () => {
    setChatTrigger(undefined);
    setScreen("chat");
    if (collapsed) expand();
  };

  const openSettings = (from: Screen) => {
    setPrevScreen(from);
    setScreen("settings");
    if (collapsed) expand();
  };

  const handleSettingsChange = (patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    window.electronAPI.updateSettings(patch);
  };

  const remainingSec = Math.max(0, activeMins * 60 - sessionUpdate.elapsedSec);

  if (isNudgeView) return <NudgeView />;

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background: "#111111",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TitleBar alwaysOnTop={settings.alwaysOnTop} />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          background: "#111111",
          overflow: "hidden",
        }}
      >
        {screen === "declare" && (
          <TaskDeclaration
            onStart={(task, durationMin) => {
              setActiveTask(task);
              setActiveMins(durationMin);
              setSessionUpdate({
                currentApp: "",
                currentAppProcess: "",
                currentAppBundle: "",
                currentAppTitle: "",
                category: "unknown",
                switchCount: 0,
                elapsedSec: 0,
                focusSec: 0,
                driftSec: 0,
                ghostState: "calm",
                recentSwitches: [],
              });
              setScreen("session");
            }}
            onOpenSettings={() => openSettings("declare")}
            accent={accent}
          />
        )}
        {screen === "session" && (
          <ActiveSession
            task={activeTask}
            durationMin={activeMins}
            sessionUpdate={sessionUpdate}
            onOpenChat={openChat}
            onOpenSettings={() => openSettings("session")}
            collapsed={collapsed}
            onCollapse={collapse}
            onExpand={expand}
            accent={accent}
          />
        )}
        {screen === "chat" && (
          <GhostChat
            task={activeTask}
            trigger={chatTrigger}
            prefillMessage={chatPrefill}
            onBack={() => {
              setChatTrigger(undefined);
              setChatPrefill(undefined);
              setScreen("session");
            }}
            onOpenSettings={() => openSettings("chat")}
            onCollapse={() => {
              setChatTrigger(undefined);
              setChatPrefill(undefined);
              setScreen("session");
              collapse();
            }}
            accent={accent}
          />
        )}
        {screen === "recap" && recap && (
          <SessionRecap
            recap={recap}
            onNewSession={() => {
              setRecap(null);
              setScreen("declare");
            }}
            onOpenSettings={() => openSettings("recap")}
            accent={accent}
          />
        )}
        {screen === "settings" && (
          <Settings
            settings={settings}
            onBack={() => setScreen(prevScreen)}
            onChange={handleSettingsChange}
          />
        )}

        {nudge && (
          <NudgePopup
            nudge={nudge}
            task={activeTask}
            investedSec={sessionUpdate.elapsedSec}
            remainingSec={remainingSec}
            onDismiss={dismissNudge}
            onStuck={() => {
              dismissNudge();
              openChat();
            }}
            onEndSession={() => {
              dismissNudge();
              window.electronAPI.endSession();
            }}
            accent={accent}
          />
        )}
      </div>
    </div>
  );
}
