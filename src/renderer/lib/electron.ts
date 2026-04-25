import {
  IPC,
  type StartSessionPayload,
  type SessionUpdate,
  type SessionRecapPayload,
  type NudgePayload,
  type GhostMessagePayload,
  type ChatResponsePayload,
  type ChatEntry,
} from '../../shared/ipc-contract';

export interface ElectronAPI {
  startSession: (payload: StartSessionPayload) => Promise<void>;
  endSession: () => Promise<void>;
  sendChat: (payload: { message: string; chatHistory: ChatEntry[] }) => Promise<void>;
  dismissNudge: () => Promise<void>;
  updateSettings: (payload: unknown) => Promise<void>;
  onSessionUpdate: (cb: (data: SessionUpdate) => void) => void;
  onNudge: (cb: (data: NudgePayload) => void) => void;
  onOpenGhostChat: (cb: () => void) => void;
  onGhostMessage: (cb: (data: GhostMessagePayload) => void) => void;
  onChatResponse: (cb: (data: ChatResponsePayload) => void) => void;
  onSessionRecap: (cb: (data: SessionRecapPayload) => void) => void;
  removeAllListeners: (channel: string) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export function startSession(task: string, durationMin: number): Promise<void> {
  return window.electronAPI.startSession({ task, durationMin });
}

export function endSession(): Promise<void> {
  return window.electronAPI.endSession();
}

export function sendChat(message: string, chatHistory: ChatEntry[]): Promise<void> {
  return window.electronAPI.sendChat({ message, chatHistory });
}

export function dismissNudge(): Promise<void> {
  return window.electronAPI.dismissNudge();
}

export function updateSettings(payload: unknown): Promise<void> {
  return window.electronAPI.updateSettings(payload);
}

let sessionUpdateHandler: ((data: SessionUpdate) => void) | null = null;
let nudgeHandler: ((data: NudgePayload) => void) | null = null;
let openGhostChatHandler: (() => void) | null = null;
let ghostMessageHandler: ((data: GhostMessagePayload) => void) | null = null;
let chatResponseHandler: ((data: ChatResponsePayload) => void) | null = null;
let sessionRecapHandler: ((data: SessionRecapPayload) => void) | null = null;

export function onSessionUpdate(cb: (data: SessionUpdate) => void): void {
  sessionUpdateHandler = cb;
  window.electronAPI.onSessionUpdate(cb);
}

export function onNudge(cb: (data: NudgePayload) => void): void {
  nudgeHandler = cb;
  window.electronAPI.onNudge(cb);
}

export function onOpenGhostChat(cb: () => void): void {
  openGhostChatHandler = cb;
  window.electronAPI.onOpenGhostChat(cb);
}

export function onGhostMessage(cb: (data: GhostMessagePayload) => void): void {
  ghostMessageHandler = cb;
  window.electronAPI.onGhostMessage(cb);
}

export function onChatResponse(cb: (data: ChatResponsePayload) => void): void {
  chatResponseHandler = cb;
  window.electronAPI.onChatResponse(cb);
}

export function onSessionRecap(cb: (data: SessionRecapPayload) => void): void {
  sessionRecapHandler = cb;
  window.electronAPI.onSessionRecap(cb);
}

export function cleanupAllListeners(): void {
  if (sessionUpdateHandler) window.electronAPI.removeAllListeners(IPC.SESSION_UPDATE);
  if (nudgeHandler) window.electronAPI.removeAllListeners(IPC.TRIGGER_NUDGE);
  if (openGhostChatHandler) window.electronAPI.removeAllListeners(IPC.OPEN_GHOST_CHAT);
  if (ghostMessageHandler) window.electronAPI.removeAllListeners(IPC.GHOST_MESSAGE);
  if (chatResponseHandler) window.electronAPI.removeAllListeners(IPC.CHAT_RESPONSE);
  if (sessionRecapHandler) window.electronAPI.removeAllListeners(IPC.SESSION_RECAP);

  sessionUpdateHandler = null;
  nudgeHandler = null;
  openGhostChatHandler = null;
  ghostMessageHandler = null;
  chatResponseHandler = null;
  sessionRecapHandler = null;
}