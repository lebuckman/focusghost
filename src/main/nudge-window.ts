import { BrowserWindow } from 'electron';
import path from 'path';
import { IPC, type NudgePayload } from '../shared/ipc-contract';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let nudgeWindow: BrowserWindow | null = null;

export function showInterruptNudge(payload: NudgePayload): void {
  if (nudgeWindow && !nudgeWindow.isDestroyed()) {
    nudgeWindow.focus();
    setTimeout(() => nudgeWindow?.webContents.send(IPC.TRIGGER_NUDGE, payload), 50);
    return;
  }

  nudgeWindow = new BrowserWindow({
    width: 460,
    height: 480,
    alwaysOnTop: true,
    frame: false,
    backgroundColor: '#111111',
    resizable: false,
    movable: true,
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    nudgeWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?view=nudge`);
  } else {
    nudgeWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { query: { view: 'nudge' } },
    );
  }

  nudgeWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => nudgeWindow?.webContents.send(IPC.TRIGGER_NUDGE, payload), 300);
  });

  nudgeWindow.on('closed', () => { nudgeWindow = null; });
}

export function closeNudgeWindow(): void {
  if (nudgeWindow && !nudgeWindow.isDestroyed()) {
    nudgeWindow.close();
    nudgeWindow = null;
  }
}

export function isNudgeWindowOpen(): boolean {
  return nudgeWindow !== null && !nudgeWindow.isDestroyed();
}
