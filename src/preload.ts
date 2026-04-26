import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './shared/ipc-contract';

contextBridge.exposeInMainWorld('electronAPI', {
  startSession:       (p: unknown) => ipcRenderer.invoke(IPC.START_SESSION, p),
  endSession:         ()           => ipcRenderer.invoke(IPC.END_SESSION),
  sendChat:           (p: unknown) => ipcRenderer.invoke(IPC.CHAT_MESSAGE, p),
  dismissNudge:       ()           => ipcRenderer.invoke(IPC.DISMISS_NUDGE),
  updateSettings:     (p: unknown) => ipcRenderer.invoke(IPC.UPDATE_SETTINGS, p),
  onSessionUpdate:    (cb: (d: unknown) => void) => ipcRenderer.on(IPC.SESSION_UPDATE,  (_e, d) => cb(d)),
  onNudge:            (cb: (d: unknown) => void) => ipcRenderer.on(IPC.TRIGGER_NUDGE,   (_e, d) => cb(d)),
  onOpenGhostChat:    (cb: (d: unknown) => void) => ipcRenderer.on(IPC.OPEN_GHOST_CHAT, (_e, d) => cb(d)),
  onGhostMessage:     (cb: (d: unknown) => void) => ipcRenderer.on(IPC.GHOST_MESSAGE,   (_e, d) => cb(d)),
  onChatResponse:     (cb: (d: unknown) => void) => ipcRenderer.on(IPC.CHAT_RESPONSE,   (_e, d) => cb(d)),
  onSessionRecap:     (cb: (d: unknown) => void) => ipcRenderer.on(IPC.SESSION_RECAP,   (_e, d) => cb(d)),
  onNudgeDismissed:   (cb: () => void)            => ipcRenderer.on(IPC.NUDGE_DISMISSED, () => cb()),
  debugNudge:         (type: string)               => ipcRenderer.invoke(IPC.DEBUG_NUDGE, type),
  removeAllListeners: (channel: string)           => ipcRenderer.removeAllListeners(channel),
  closeWindow:        ()                           => ipcRenderer.send('WINDOW_CLOSE'),
  minimizeWindow:     ()                           => ipcRenderer.send('WINDOW_MINIMIZE'),
  collapseWindow:     ()                           => ipcRenderer.send('WINDOW_COLLAPSE'),
  expandWindow:       ()                           => ipcRenderer.send('WINDOW_EXPAND'),
  getSettings:        ()                           => ipcRenderer.invoke(IPC.GET_SETTINGS),
  setWindowDim:       (d: boolean)                 => ipcRenderer.invoke(IPC.SET_WINDOW_DIM, d),
});
