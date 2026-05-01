import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "./shared/ipc-contract";
import type {
  AppSettings,
  ChatMessagePayload,
  ChatResponsePayload,
  GhostMessagePayload,
  IPCChannel,
  NudgePayload,
  OpenGhostChatPayload,
  SessionRecapPayload,
  SessionUpdate,
  StartSessionPayload,
  NudgeType,
} from "./shared/ipc-contract";

contextBridge.exposeInMainWorld("electronAPI", {
  startSession: (payload: StartSessionPayload) =>
    ipcRenderer.invoke(IPC.START_SESSION, payload),
  endSession: () => ipcRenderer.invoke(IPC.END_SESSION),
  sendChat: (payload: ChatMessagePayload) =>
    ipcRenderer.invoke(IPC.CHAT_MESSAGE, payload),
  dismissNudge: () => ipcRenderer.invoke(IPC.DISMISS_NUDGE),
  updateSettings: (payload: Partial<AppSettings>) =>
    ipcRenderer.invoke(IPC.UPDATE_SETTINGS, payload),
  onSessionUpdate: (cb: (data: SessionUpdate) => void) =>
    ipcRenderer.on(IPC.SESSION_UPDATE, (_e, data) => cb(data as SessionUpdate)),
  onNudge: (cb: (data: NudgePayload) => void) =>
    ipcRenderer.on(IPC.TRIGGER_NUDGE, (_e, data) => cb(data as NudgePayload)),
  onOpenGhostChat: (cb: (data: OpenGhostChatPayload) => void) =>
    ipcRenderer.on(IPC.OPEN_GHOST_CHAT, (_e, data) =>
      cb(data as OpenGhostChatPayload),
    ),
  onGhostMessage: (cb: (data: GhostMessagePayload) => void) =>
    ipcRenderer.on(IPC.GHOST_MESSAGE, (_e, data) =>
      cb(data as GhostMessagePayload),
    ),
  onChatResponse: (cb: (data: ChatResponsePayload) => void) =>
    ipcRenderer.on(IPC.CHAT_RESPONSE, (_e, data) =>
      cb(data as ChatResponsePayload),
    ),
  onSessionRecap: (cb: (data: SessionRecapPayload) => void) =>
    ipcRenderer.on(IPC.SESSION_RECAP, (_e, data) =>
      cb(data as SessionRecapPayload),
    ),
  onNudgeDismissed: (cb: () => void) =>
    ipcRenderer.on(IPC.NUDGE_DISMISSED, () => cb()),
  debugNudge: (type: NudgeType) => ipcRenderer.invoke(IPC.DEBUG_NUDGE, type),
  removeAllListeners: (channel: IPCChannel) =>
    ipcRenderer.removeAllListeners(channel),
  closeWindow: () => ipcRenderer.send(IPC.WINDOW_CLOSE),
  minimizeWindow: () => ipcRenderer.send(IPC.WINDOW_MINIMIZE),
  collapseWindow: () => ipcRenderer.send(IPC.WINDOW_COLLAPSE),
  expandWindow: () => ipcRenderer.send(IPC.WINDOW_EXPAND),
  getSettings: () =>
    ipcRenderer.invoke(IPC.GET_SETTINGS) as Promise<AppSettings>,
  requestGhostChat: (reason?: string) =>
    ipcRenderer.invoke(IPC.REQUEST_GHOST_CHAT, reason),
  snoozeNudge: (appName?: string) =>
    ipcRenderer.invoke(IPC.SNOOZE_NUDGE, appName),
  blockApp: (appName: string, until: number) =>
    ipcRenderer.invoke(IPC.BLOCK_APP, appName, until),
  classifyCorrection: (payload: unknown) =>
    ipcRenderer.invoke(IPC.CLASSIFY_CORRECTION, payload),
  setWindowDim: (dimmed: boolean) =>
    ipcRenderer.invoke(IPC.SET_WINDOW_DIM, dimmed),
  platform: process.platform,
});
