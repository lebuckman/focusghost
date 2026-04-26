import { BrowserWindow, screen } from 'electron';
import path from 'path';
import { IPC, type NudgePayload, type NudgeType } from '../shared/ipc-contract';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let nudgeWindow: BrowserWindow | null = null;

const NUDGE_DIMS: Partial<Record<NudgeType, { width: number; height: number }>> = {
  'distraction-firm':      { width: 480, height: 260 },
  'distraction-hard':      { width: 480, height: 300 },
  'stuck-helpful':         { width: 480, height: 320 },
  'idle-soft':             { width: 480, height: 260 },
  'milestone-positive':    { width: 420, height: 220 },
  'pattern-observational': { width: 480, height: 300 },
};

export function showInterruptNudge(payload: NudgePayload): void {
  if (nudgeWindow && !nudgeWindow.isDestroyed()) {
    nudgeWindow.focus();
    setTimeout(() => nudgeWindow?.webContents.send(IPC.TRIGGER_NUDGE, payload), 50);
    return;
  }

  const dims = NUDGE_DIMS[payload.type] ?? { width: 480, height: 260 };
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

  nudgeWindow = new BrowserWindow({
    width: dims.width,
    height: dims.height,
    alwaysOnTop: true,
    frame: true,
    titleBarStyle: 'hiddenInset',
    title: 'FocusGhost',
    backgroundColor: '#0f1419',
    resizable: false,
    movable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  nudgeWindow.setPosition(
    Math.round((sw - dims.width) / 2),
    Math.round((sh - dims.height) / 2),
  );

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
