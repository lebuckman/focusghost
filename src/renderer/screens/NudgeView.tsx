import { useEffect, useState } from "react";
import { NudgeContent } from "../components/NudgePopup";
import type { NudgePayload, AppSettings } from "../../shared/ipc-contract";
import { IPC } from "../../shared/ipc-contract";
import { isAppSettings, isNudgePayload } from "../../shared/ipc-validators";

const ACCENT_MAP: Record<AppSettings["accentColor"], string> = {
  teal: "#2dd4bf",
  violet: "#a78bfa",
  amber: "#facc15",
};

export default function NudgeView() {
  const [nudge, setNudge] = useState<NudgePayload | null>(null);
  const [accent, setAccent] = useState("#2dd4bf");

  useEffect(() => {
    window.electronAPI.getSettings().then((s) => {
      if (!isAppSettings(s)) {
        console.warn("[electronAPI] Ignored invalid GET_SETTINGS payload");
        return;
      }

      if (s.accentColor) setAccent(ACCENT_MAP[s.accentColor] ?? "#2dd4bf");
    });
    window.electronAPI.onNudge((d) => {
      if (!isNudgePayload(d)) {
        console.warn("[electronAPI] Ignored invalid TRIGGER_NUDGE payload");
        return;
      }

      setNudge(d);
    });
    return () => window.electronAPI.removeAllListeners(IPC.TRIGGER_NUDGE);
  }, []);

  const dismiss = () => window.electronAPI.dismissNudge();
  const stuck = (reason?: string) => {
    window.electronAPI.dismissNudge();
    // "i'm fine" just closes the popup with no chat
    if (reason === "i'm fine") return;
    // 'chat_with_ghost' opens chat without a prefill; chip text becomes the first user message
    window.electronAPI.requestGhostChat(
      reason !== "chat_with_ghost" ? reason : undefined,
    );
  };
  const endSession = () => {
    window.electronAPI.dismissNudge();
    window.electronAPI.endSession();
  };
  const snooze = () => {
    window.electronAPI.dismissNudge();
    window.electronAPI.snoozeNudge(nudge?.context?.appName);
  };
  const block = () => {
    window.electronAPI.dismissNudge();
    if (nudge?.context?.appName) {
      window.electronAPI.blockApp(
        nudge.context.appName,
        Date.now() + 30 * 60 * 1000,
      );
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#0f1419",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {nudge ? (
        <NudgeContent
          nudge={nudge}
          task={nudge.context?.task ?? ""}
          investedSec={nudge.context?.investedSec ?? 0}
          remainingSec={nudge.context?.remainingSec ?? 0}
          onDismiss={dismiss}
          onStuck={stuck}
          onEndSession={endSession}
          onSnooze={snooze}
          onBlock={block}
          accent={accent}
        />
      ) : (
        <div style={{ fontSize: 11, color: "#525252", padding: 20 }}>
          loading...
        </div>
      )}
    </div>
  );
}
