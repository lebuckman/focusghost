// All IPC channel names live here so main and preload stay in sync.

export const IPC = {
  // invoke channels (renderer -> main, returns Promise)
  startSession: "fg:session:start",
  pauseSession: "fg:session:pause",
  resumeSession: "fg:session:resume",
  endSession: "fg:session:end",
  getCurrentSession: "fg:session:current",
  getSessions: "fg:session:list",

  setOpacity: "fg:window:opacity",
  setAlwaysOnTop: "fg:window:aot",
  collapseWindow: "fg:window:collapse",

  getSettings: "fg:settings:get",
  updateSettings: "fg:settings:update",

  categorizeApp: "fg:cat:check",
  setAppCategoryOverride: "fg:cat:override",

  sendChatMessage: "fg:chat:send",
  getChatHistory: "fg:chat:history",
  clearChatHistory: "fg:chat:clear",

  triggerDemoEvent: "fg:demo:trigger",

  // event channels (main -> renderer, push)
  evtSessionUpdate: "fg:evt:session:update",
  evtSessionTick: "fg:evt:session:tick",
  evtActiveWindow: "fg:evt:active-window",
  evtNudge: "fg:evt:nudge",
  evtSettingsUpdate: "fg:evt:settings:update",
  evtGhostMessage: "fg:evt:ghost:message",
} as const

export type IPCInvokeChannel =
  | typeof IPC.startSession
  | typeof IPC.pauseSession
  | typeof IPC.resumeSession
  | typeof IPC.endSession
  | typeof IPC.getCurrentSession
  | typeof IPC.getSessions
  | typeof IPC.setOpacity
  | typeof IPC.setAlwaysOnTop
  | typeof IPC.collapseWindow
  | typeof IPC.getSettings
  | typeof IPC.updateSettings
  | typeof IPC.categorizeApp
  | typeof IPC.setAppCategoryOverride
  | typeof IPC.sendChatMessage
  | typeof IPC.getChatHistory
  | typeof IPC.clearChatHistory
  | typeof IPC.triggerDemoEvent
