import { contextBridge, ipcRenderer } from "electron";
import {
  IPC,
  type IPCChannel,
  type StartSessionPayload,
  type SessionUpdate,
  type SessionRecapPayload,
  type NudgePayload,
  type GhostMessagePayload,
  type ChatResponsePayload,
  type ChatEntry,
  type AppSettings,
} from "../shared/ipc-contract";

export interface FocusGhostAPI {
  startSession: (payload: StartSessionPayload) => Promise<void>;
  endSession: () => Promise<void>;
  sendChat: (payload: { message: string; chatHistory: ChatEntry[] }) => Promise<void>;
  dismissNudge: () => Promise<void>;
  updateSettings: (payload: Partial<AppSettings>) => Promise<void>;
  expand: () => void;
  collapse: () => void;
  setOpacity: (opacity: number) => void;
  setPinned: (pinned: boolean) => void;
  onSessionUpdate: (cb: (data: SessionUpdate) => void) => void;
  onNudge: (cb: (data: NudgePayload) => void) => void;
  onGhostChat: (cb: () => void) => void;
  onGhostMessage: (cb: (data: GhostMessagePayload) => void) => void;
  onChatResponse: (cb: (data: ChatResponsePayload) => void) => void;
  onSessionRecap: (cb: (data: SessionRecapPayload) => void) => void;
  onNudgeShow: (cb: (data: { message: string; urgent: boolean }) => void) => void;
  removeAllListeners: (channel: IPCChannel) => void;
}

const api: FocusGhostAPI = {
  startSession: (payload) => ipcRenderer.invoke(IPC.START_SESSION, payload),
  endSession: () => ipcRenderer.invoke(IPC.END_SESSION),
  sendChat: (payload) => ipcRenderer.invoke(IPC.CHAT_MESSAGE, payload),
  dismissNudge: () => ipcRenderer.invoke(IPC.DISMISS_NUDGE),
  updateSettings: (payload) => ipcRenderer.invoke(IPC.UPDATE_SETTINGS, payload),
  expand: () => ipcRenderer.send("window:expand"),
  collapse: () => ipcRenderer.send("window:collapse"),
  setOpacity: (opacity) => ipcRenderer.send("window:opacity", opacity),
  setPinned: (pinned) => ipcRenderer.send("window:pin", pinned),
  onSessionUpdate: (cb) => ipcRenderer.on(IPC.SESSION_UPDATE, (_e, data) => cb(data)),
  onNudge: (cb) => ipcRenderer.on(IPC.TRIGGER_NUDGE, (_e, data) => cb(data)),
  onGhostChat: (cb) => ipcRenderer.on(IPC.OPEN_GHOST_CHAT, () => cb()),
  onGhostMessage: (cb) => ipcRenderer.on(IPC.GHOST_MESSAGE, (_e, data) => cb(data)),
  onChatResponse: (cb) => ipcRenderer.on(IPC.CHAT_RESPONSE, (_e, data) => cb(data)),
  onSessionRecap: (cb) => ipcRenderer.on(IPC.SESSION_RECAP, (_e, data) => cb(data)),
  onNudgeShow: (cb) => ipcRenderer.on("nudge:show", (_e, data) => cb(data)),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
};

contextBridge.exposeInMainWorld("electronAPI", api);

export type { SessionUpdate, SessionRecapPayload, NudgePayload, ChatEntry };