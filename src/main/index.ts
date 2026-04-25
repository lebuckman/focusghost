import { app, BrowserWindow, ipcMain, screen } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  IPC,
  DEFAULT_SETTINGS,
  type StartSessionPayload,
  type SessionUpdate,
  type SessionRecapPayload,
  type ChatEntry,
  type AppSettings,
} from "../shared/ipc-contract";
import { windowController, type WindowMode } from "./windowController";
import { sessionMachine } from "./sessionMachine";
import { windowController as wc } from "./windowController";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAppPath(path.join(process.argv[1]));
  }
}

let settings: AppSettings = { ...DEFAULT_SETTINGS };

async function pollActiveWindow(): Promise<void> {
  try {
    const mod = await import("active-win");
    const activeWin = (mod as { default: () => Promise<unknown> }).default;
    const win = (await activeWin()) as {
      owner: { name: string; bundleId?: string };
      title: string;
    } | undefined;

    if (!win) return;
    sessionMachine.onActiveWindow(win.owner.name, win.owner.bundleId ?? "", win.title);
  } catch {
    // active-win throws if no window is focused or on permission error
  }
}

function registerIPC(): void {
  ipcMain.handle(IPC.START_SESSION, (_e, payload: StartSessionPayload) => {
    sessionMachine.start(payload.task, payload.durationMin);
    windowController.expand();
  });

  ipcMain.handle(IPC.END_SESSION, () => {
    sessionMachine.end();
  });

  ipcMain.handle(IPC.CHAT_MESSAGE, (_e, payload: { message: string; chatHistory: ChatEntry[] }) => {
    const userEntry: ChatEntry = { role: "user", content: payload.message, timestamp: Date.now() };
    const replyText = `You're working on the current task. What specific thing is blocking you?`;
    const ghostEntry: ChatEntry = { role: "ghost", content: replyText, timestamp: Date.now() };

    windowController.sendToPanel(IPC.CHAT_RESPONSE, { message: replyText, timestamp: ghostEntry.timestamp });
    windowController.sendToPanel(IPC.GHOST_MESSAGE, {
      message: replyText,
      trigger: "user_reply",
      timestamp: ghostEntry.timestamp,
    });
  });

  ipcMain.handle(IPC.DISMISS_NUDGE, () => {
    windowController.dismissNudge();
  });

  ipcMain.handle(IPC.UPDATE_SETTINGS, (_e, payload: Partial<AppSettings>) => {
    settings = { ...settings, ...payload };
    if (typeof payload.opacity === "number") {
      windowController.setOpacity(payload.opacity);
    }
    if (typeof payload.alwaysOnTop === "boolean") {
      windowController.panel?.setAlwaysOnTop(payload.alwaysOnTop);
    }
    return settings;
  });

  // Window mode controls
  ipcMain.on("window:expand", () => {
    windowController.expand();
  });

  ipcMain.on("window:collapse", () => {
    windowController.collapse();
  });

  ipcMain.on("window:opacity", (_e, opacity: number) => {
    windowController.setOpacity(opacity);
  });

  ipcMain.on("window:pin", (_e, pinned: boolean) => {
    windowController.setPinned(pinned);
  });
}

function setupSessionListeners(): void {
  sessionMachine.on("update", (data: SessionUpdate) => {
    windowController.sendToPanel(IPC.SESSION_UPDATE, data);
  });

  sessionMachine.on("nudge", (data: { message: string; driftType: string; urgent: boolean }) => {
    windowController.sendToPanel(IPC.TRIGGER_NUDGE, {
      message: data.message,
      driftType: data.driftType,
      urgent: data.urgent,
    });
    windowController.showNudge(data.message, data.urgent);
  });

  sessionMachine.on("recap", (data: SessionRecapPayload) => {
    windowController.sendToPanel(IPC.SESSION_RECAP, data);
    windowController.expand();
  });

  sessionMachine.on("state-change", (state: WindowMode) => {
    windowController.sendToAnchor("session:state", state);
  });
}

app.whenReady().then(() => {
  registerIPC();
  setupSessionListeners();

  // Create anchor window
  windowController.createAnchor();

  // Start polling for active window every 2 seconds
  setInterval(pollActiveWindow, 2000);

  app.on("activate", () => {
    if (windowController.anchor?.isDestroyed()) {
      windowController.createAnchor();
    }
  });
});

app.on("window-all-closed", () => {
  windowController.destroy();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  windowController.destroy();
  sessionMachine.end();
});