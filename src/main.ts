import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import started from 'electron-squirrel-startup';
import {
  IPC,
  DEFAULT_SETTINGS,
  type StartSessionPayload,
  type SessionUpdate,
  type SessionRecapPayload,
  type SwitchEntry,
  type NudgeEntry,
  type ChatEntry,
  type AppSettings,
  type WindowCategory,
  type GhostMascotState,
} from './shared/ipc-contract';

if (started) app.quit();

// ── App categorizer ──────────────────────────────────────────────────────────

const FOCUS_BUNDLES = new Set([
  'com.microsoft.VSCode', 'com.apple.dt.Xcode', 'com.jetbrains.intellij',
  'com.apple.Terminal', 'com.googlecode.iterm2', 'com.figma.Desktop',
  'com.sublimetext.4', 'io.cursor.Cursor', 'com.todesktop.230313mzl4w4u92',
]);
const DISTRACTION_BUNDLES = new Set([
  'com.hnc.Discord', 'com.spotify.client', 'com.apple.TV',
]);
const DISTRACTION_NAME_RE = /youtube|netflix|twitch|tiktok|instagram|twitter|reddit/i;
const RESEARCH_BUNDLES = new Set([
  'com.google.Chrome', 'org.mozilla.firefox', 'com.apple.Safari',
  'com.microsoft.edgemac',
]);

function categorize(appName: string, bundleId: string): WindowCategory {
  if (FOCUS_BUNDLES.has(bundleId)) return 'focus';
  if (DISTRACTION_BUNDLES.has(bundleId)) return 'distraction';
  if (DISTRACTION_NAME_RE.test(appName)) return 'distraction';
  if (RESEARCH_BUNDLES.has(bundleId)) return 'research';
  return 'unknown';
}

// ── Session state ─────────────────────────────────────────────────────────────

interface SessionState {
  task: string;
  durationMin: number;
  startTime: number;
  switchLog: SwitchEntry[];
  nudgeLog: NudgeEntry[];
  chatHistory: ChatEntry[];
  lastApp: string;
  lastCategory: WindowCategory;
  focusSec: number;
  driftSec: number;
  switchCount: number;
  pollTimer: ReturnType<typeof setInterval> | null;
  endTimer: ReturnType<typeof setTimeout> | null;
}

let session: SessionState | null = null;
let settings: AppSettings = DEFAULT_SETTINGS;
let mainWindow: BrowserWindow | null = null;

// Cache the activeWin function after first dynamic import to avoid re-importing each tick
let activeWinFn: (() => Promise<unknown>) | null = null;
async function getActiveWin(): Promise<unknown> {
  if (!activeWinFn) {
    const mod = await import('active-win');
    activeWinFn = (mod as { default: () => Promise<unknown> }).default;
  }
  return activeWinFn();
}

function deriveGhostState(category: WindowCategory, driftSec: number): GhostMascotState {
  if (category === 'distraction') return driftSec > 90 ? 'concerned' : 'thinking';
  if (category === 'focus') return 'calm';
  return 'calm';
}

async function pollActiveWindow() {
  if (!session || !mainWindow) return;
  try {
    const win = await getActiveWin() as { owner: { name: string; bundleId?: string } } | undefined;
    if (!win) return;

    const appName = win.owner.name;
    const bundleId = win.owner.bundleId ?? '';
    const category = categorize(appName, bundleId);
    const now = Date.now();
    const elapsedSec = Math.floor((now - session.startTime) / 1000);

    if (appName !== session.lastApp) {
      session.switchLog.push({ app: appName, category, timestamp: now });
      session.switchCount += 1;
      session.lastApp = appName;
      session.lastCategory = category;
    }

    // Accumulate focus/drift in 2-second ticks
    if (category === 'focus' || category === 'research') {
      session.focusSec += 2;
    } else if (category === 'distraction') {
      session.driftSec += 2;
    }

    const update: SessionUpdate = {
      currentApp: appName,
      currentAppBundle: bundleId,
      category,
      switchCount: session.switchCount,
      elapsedSec,
      focusSec: session.focusSec,
      driftSec: session.driftSec,
      ghostState: deriveGhostState(category, session.driftSec),
      recentSwitches: session.switchLog.slice(-5).reverse(),
    };

    mainWindow.webContents.send(IPC.SESSION_UPDATE, update);
  } catch {
    // active-win throws if no window is focused or on permission error — ignore
  }
}

function buildRecap(): SessionRecapPayload {
  if (!session) throw new Error('no active session');

  const appTime = new Map<string, { seconds: number; category: WindowCategory }>();
  const entries = session.switchLog;
  for (let i = 0; i < entries.length; i++) {
    const from = entries[i].timestamp;
    const to = i + 1 < entries.length ? entries[i + 1].timestamp : Date.now();
    const secs = Math.max(0, Math.floor((to - from) / 1000));
    const existing = appTime.get(entries[i].app);
    if (existing) {
      existing.seconds += secs;
    } else {
      appTime.set(entries[i].app, { seconds: secs, category: entries[i].category });
    }
  }

  const appBreakdown = Array.from(appTime.entries())
    .map(([appName, { seconds, category }]) => ({ app: appName, category, seconds }))
    .sort((a, b) => b.seconds - a.seconds);

  const totalSec = Math.max(1, session.focusSec + session.driftSec);
  const focusPct = Math.round((session.focusSec / totalSec) * 100);
  let insight: string;
  if (focusPct >= 80) {
    insight = `Strong session — you stayed focused ${focusPct}% of the time on "${session.task}". Keep that streak going.`;
  } else if (focusPct >= 60) {
    insight = `Decent focus at ${focusPct}% on "${session.task}". A few drifts but you pulled back. Try closing distracting tabs before the next session.`;
  } else {
    insight = `Tough one — only ${focusPct}% focus time. Identify what pulled you away from "${session.task}" and eliminate it before the next session.`;
  }

  return {
    task: session.task,
    durationMin: session.durationMin,
    focusSec: session.focusSec,
    driftSec: session.driftSec,
    totalSwitches: session.switchCount,
    nudgesReceived: session.nudgeLog.length,
    nudgesDismissedAsBreak: 0,
    appBreakdown,
    insight,
    switchLog: session.switchLog,
  };
}

function endSession() {
  if (!session) return;
  if (session.pollTimer) clearInterval(session.pollTimer);
  if (session.endTimer) clearTimeout(session.endTimer);
  const recap = buildRecap();
  session = null;
  mainWindow?.webContents.send(IPC.SESSION_RECAP, recap);
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

function registerIPC() {
  ipcMain.handle(IPC.START_SESSION, (_e, payload: StartSessionPayload) => {
    // Clean up any running session first
    if (session) {
      if (session.pollTimer) clearInterval(session.pollTimer);
      if (session.endTimer) clearTimeout(session.endTimer);
    }
    session = {
      task: payload.task,
      durationMin: payload.durationMin,
      startTime: Date.now(),
      switchLog: [],
      nudgeLog: [],
      chatHistory: [],
      lastApp: '',
      lastCategory: 'unknown',
      focusSec: 0,
      driftSec: 0,
      switchCount: 0,
      pollTimer: setInterval(pollActiveWindow, 2000),
      endTimer: setTimeout(endSession, payload.durationMin * 60 * 1000),
    };
  });

  ipcMain.handle(IPC.END_SESSION, () => {
    endSession();
  });

  ipcMain.handle(IPC.CHAT_MESSAGE, (_e, payload: { message: string; chatHistory: ChatEntry[] }) => {
    if (!session) return;
    const userEntry: ChatEntry = { role: 'user', content: payload.message, timestamp: Date.now() };
    session.chatHistory.push(userEntry);

    // Stub response — replace with Gemini call when ready
    const replyText = `Hang in there — you're working on "${session.task}". What's the specific thing blocking you right now?`;
    const ghostEntry: ChatEntry = { role: 'ghost', content: replyText, timestamp: Date.now() };
    session.chatHistory.push(ghostEntry);

    mainWindow?.webContents.send(IPC.CHAT_RESPONSE, { message: replyText, timestamp: ghostEntry.timestamp });
  });

  ipcMain.handle(IPC.DISMISS_NUDGE, () => {
    // Nudge state lives in renderer; nothing to do in main yet
  });

  ipcMain.handle(IPC.UPDATE_SETTINGS, (_e, payload: Partial<AppSettings>) => {
    settings = { ...settings, ...payload };
    if (mainWindow && 'alwaysOnTop' in payload) {
      mainWindow.setAlwaysOnTop(settings.alwaysOnTop);
    }
  });
}

// ── Window ────────────────────────────────────────────────────────────────────

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 620,
    alwaysOnTop: true,
    frame: false,
    resizable: false,
    movable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => { mainWindow = null; });
};

app.on('ready', () => {
  registerIPC();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
