export {};
declare global {
  interface Window {
    electronAPI: {
      startSession:       (payload: unknown) => Promise<void>;
      endSession:         () => Promise<void>;
      sendChat:           (payload: unknown) => Promise<void>;
      dismissNudge:       () => Promise<void>;
      debugNudge:         (type: string) => Promise<void>;
      updateSettings:     (payload: unknown) => Promise<void>;
      onSessionUpdate:    (cb: (data: unknown) => void) => void;
      onNudge:            (cb: (data: unknown) => void) => void;
      onOpenGhostChat:    (cb: (data: unknown) => void) => void;
      onGhostMessage:     (cb: (data: unknown) => void) => void;
      onChatResponse:     (cb: (data: unknown) => void) => void;
      onSessionRecap:     (cb: (data: unknown) => void) => void;
      onNudgeDismissed:   (cb: () => void) => void;
      removeAllListeners: (channel: string) => void;
      closeWindow:        () => void;
      minimizeWindow:     () => void;
      collapseWindow:     () => void;
      expandWindow:       () => void;
      getSettings:        () => Promise<unknown>;
      requestGhostChat:   (reason?: string) => Promise<void>;
      snoozeNudge:        (appName?: string) => Promise<void>;
      blockApp:           (appName: string, until: number) => Promise<void>;
      classifyCorrection: (payload: unknown) => Promise<void>;
      setWindowDim:       (dimmed: boolean) => Promise<void>;
      platform:           string;
    };
  }
}
