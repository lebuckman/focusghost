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
} from "../shared/ipc-contract";

export {};
declare global {
  interface Window {
    electronAPI: {
      startSession: (payload: StartSessionPayload) => Promise<void>;
      endSession: () => Promise<void>;
      sendChat: (payload: ChatMessagePayload) => Promise<void>;
      dismissNudge: () => Promise<void>;
      debugNudge: (type: NudgeType) => Promise<void>;
      updateSettings: (payload: Partial<AppSettings>) => Promise<void>;
      onSessionUpdate: (cb: (data: SessionUpdate) => void) => void;
      onNudge: (cb: (data: NudgePayload) => void) => void;
      onOpenGhostChat: (cb: (data: OpenGhostChatPayload) => void) => void;
      onGhostMessage: (cb: (data: GhostMessagePayload) => void) => void;
      onChatResponse: (cb: (data: ChatResponsePayload) => void) => void;
      onSessionRecap: (cb: (data: SessionRecapPayload) => void) => void;
      onNudgeDismissed: (cb: () => void) => void;
      removeAllListeners: (channel: IPCChannel) => void;
      closeWindow: () => void;
      minimizeWindow: () => void;
      collapseWindow: () => void;
      expandWindow: () => void;
      getSettings: () => Promise<AppSettings>;
      requestGhostChat: (reason?: string) => Promise<void>;
      snoozeNudge: (appName?: string) => Promise<void>;
      blockApp: (appName: string, until: number) => Promise<void>;
      classifyCorrection: (payload: unknown) => Promise<void>;
      setWindowDim: (dimmed: boolean) => Promise<void>;
      platform: string;
    };
  }
}
