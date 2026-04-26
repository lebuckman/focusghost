import { BrowserWindow, screen } from 'electron';
import path from 'path';
import { IPC, type NudgePayload, type NudgeType } from '../shared/ipc-contract';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

let nudgeWindow: BrowserWindow | null = null;

const NUDGE_DIMS: Partial<Record<NudgeType, { width: number; height: number }>> = {
  'distraction-firm':      { width: 480, height: 380 },
  'distraction-hard':      { width: 480, height: 380 },
  'stuck-helpful':         { width: 480, height: 380 },
  'idle-soft':             { width: 480, height: 380 },
  'milestone-positive':    { width: 480, height: 380 },
  'pattern-observational': { width: 480, height: 380 },
};

export function showInterruptNudge(payload: NudgePayload, forceReplace = false): void {
  if (nudgeWindow && !nudgeWindow.isDestroyed()) {
    if (forceReplace) {
      // Force-close the existing popup (idle-soft overrides anything)
      nudgeWindow.close();
      nudgeWindow = null; // clear immediately so the 'closed' event doesn't race
    } else {
      // Another popup is already showing — update its content instead of stacking
      nudgeWindow.focus();
      setTimeout(() => nudgeWindow?.webContents.send(IPC.TRIGGER_NUDGE, payload), 50);
      return;
    }
  }

  const dims = NUDGE_DIMS[payload.type] ?? { width: 480, height: 380 };
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

  const thisWindow = new BrowserWindow({
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
  nudgeWindow = thisWindow;

  thisWindow.setPosition(
    Math.round((sw - dims.width) / 2),
    Math.round((sh - dims.height) / 2),
  );

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    thisWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?view=nudge`);
  } else {
    thisWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { query: { view: 'nudge' } },
    );
  }

  // Use thisWindow (not nudgeWindow?) to guarantee the right target even if nudgeWindow
  // is replaced before did-finish-load fires
  thisWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => thisWindow.webContents.send(IPC.TRIGGER_NUDGE, payload), 300);
  });

  // Only null the module-level reference if it still points to THIS window —
  // prevents a force-replaced window's 'closed' event from nullifying a newly
  // created window's reference.
  thisWindow.on('closed', () => {
    if (nudgeWindow === thisWindow) nudgeWindow = null;
  });
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

// Used by DISMISS_NUDGE handler to distinguish nudge-window vs main-window senders
export function isNudgeWindowSender(sender: Electron.WebContents): boolean {
  return nudgeWindow !== null && !nudgeWindow.isDestroyed() && nudgeWindow.webContents === sender;
}
