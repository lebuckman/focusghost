import "dotenv/config";

import { randomUUID } from "crypto";
import { app, BrowserWindow, ipcMain, powerMonitor, Menu } from "electron";
import { extractTabTitle } from "./main/get-browser-tab";
import {
  showInterruptNudge,
  closeNudgeWindow,
  isNudgeWindowOpen,
} from "./main/nudge-window";
import path from "path";
import started from "electron-squirrel-startup";
import Store from "electron-store";
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
  type AppStore,
  type WindowCategory,
  type GhostMascotState,
  type NudgePayload,
  type NudgeType,
  type GhostMessagePayload,
  type OpenGhostChatPayload,
} from "./shared/ipc-contract";
import {
  initializeAIOrchestrator,
  generateChatResponse,
  generateInsight,
  generateNudgeMessage,
  recordSessionMemory,
<<<<<<< HEAD
} from "./main/ai/aiOrchestrator";
=======
} from './main/ai/aiOrchestrator';
import { speakNudge, stopNudgeSpeech } from './main/voice/elevenLabsService';
>>>>>>> 6aa41db (refactor(new elevenlabs))

if (started) app.quit();

// ── Persistent store ──────────────────────────────────────────────────────────

const store = new Store<AppStore>();
const deviceId =
  (store.get("deviceId") as string | undefined) ??
  (() => {
    const id = randomUUID();
    store.set("deviceId", id);
    return id;
  })();

// ── App categorizer ──────────────────────────────────────────────────────────

const FOCUS_BUNDLES = new Set([
  // Code editors & IDEs
  "com.microsoft.VSCode",
  "com.apple.dt.Xcode",
  "io.cursor.Cursor",
  "com.sublimetext.4",
  "dev.zed.Zed",
  "com.jetbrains.intellij",
  "com.jetbrains.webstorm",
  "com.jetbrains.pycharm",
  "com.jetbrains.goland",
  "com.jetbrains.clion",
  "com.jetbrains.rider",
  "com.jetbrains.datagrip",
  "com.jetbrains.rubymine",
  "com.jetbrains.appcode",
  "com.todesktop.230313mzl4w4u92", // Windsurf
  // Terminals
  "com.apple.Terminal",
  "com.googlecode.iterm2",
  "dev.warp.Warp",
  "com.mitchellh.ghostty",
  "com.alacritty.Alacritty",
  // Design
  "com.figma.Desktop",
  "com.sketch.sketch",
  "com.adobe.Photoshop",
  "com.adobe.illustrator",
  "com.adobe.InDesign",
  "com.adobe.Premiere",
  "com.adobe.AfterEffects",
  "com.adobe.AdobeXD",
  // Writing & notes
  "com.obsidian.md",
  "md.obsidian",
  "com.notion.id",
  "com.apple.Notes",
  "net.shinyfrog.bear",
  "com.ulyssesapp.mac",
  "com.adobe.Reader",
  "com.readdle.pdf-squeezer-4",
  // Office & docs
  "com.microsoft.Word",
  "com.microsoft.Excel",
  "com.microsoft.Powerpoint",
  "com.microsoft.OneNote",
  "com.apple.iWork.Pages",
  "com.apple.iWork.Numbers",
  "com.apple.iWork.Keynote",
  // Dev tools
  "com.github.GitHubDesktop",
  "com.apple.dt.Instruments",
  "com.postmanlabs.mac",
  "com.insomnia.app",
  "io.paw.mac",
  "com.tableplus.TablePlus",
  "com.sequelpro.SequelPro",
  "com.dbeaver.product",
  "com.tinyapp.TableFlip",
  "com.docker.docker",
  "com.virtualbox.app",
  "com.parallels.desktop",
  "com.apple.Simulator",
  // Task / project management
  "com.culturedcode.ThingsMac",
  "com.todoist.mac.Todoist",
  "com.linear.app",
  "io.linear",
  // Meetings (treated as focus — active work/class)
  "us.zoom.xos",
  "com.microsoft.teams",
  "com.microsoft.teams2",
  "com.loom.desktop",
]);

const FOCUS_NAME_RE =
  /\b(terminal|iterm|iterm2|ghostty|warp|alacritty|vs code|vscode|cursor|zed|xcode|webstorm|pycharm|intellij|android studio|sublime|obsidian|notion|bear|ulysses|word|excel|powerpoint|keynote|pages|numbers|onenote|figma|sketch|photoshop|illustrator|indesign|premiere|after effects|postman|insomnia|tableplus|sequel pro|dbeaver|docker|simulator|zoom|microsoft teams|loom|things|todoist|linear|github desktop|winsurf|windsurf|raycast)\b/i;

const DISTRACTION_BUNDLES = new Set([
  "com.hnc.Discord",
  "com.spotify.client",
  "com.apple.TV",
  "com.facebook.archon",
  "com.apple.Music",
  "com.whatsapp.WhatsApp",
  "ph.telegra.Telegraph",
]);

const DISTRACTION_NAME_RE =
  /\b(youtube|netflix|twitch|tiktok|instagram|twitter|x\.com|reddit|steam|epicgames|discord|prime video|primevideo|hulu|disney\+|disneyplus|peacock|facebook|snapchat|espn|crunchyroll|soundcloud|bandcamp|9gag|tumblr|pinterest|linkedin)\b/i;

const RESEARCH_BUNDLES = new Set([
  "com.google.Chrome",
  "org.mozilla.firefox",
  "com.apple.Safari",
  "com.microsoft.edgemac",
  "com.brave.Browser",
  "com.operasoftware.Opera",
  "company.thebrowser.Browser", // Arc
  "app.zen-browser.zen", // Zen Browser
  "com.vivaldi.Vivaldi",
  "com.kagi.kagimacOS", // Orion
  "com.apple.Preview",
  "com.readdle.PDFExpert",
  "com.pdfpen.pdfpen7",
]);

// Catches any unrecognized browser by app name — stops them falling through to 'unknown'
const RESEARCH_NAME_RE = /browser|navigator/i;

function categorize(
  appName: string,
  bundleId: string,
  title: string,
): WindowCategory {
  if (FOCUS_BUNDLES.has(bundleId)) return "focus";
  if (DISTRACTION_BUNDLES.has(bundleId)) return "distraction";
  if (DISTRACTION_NAME_RE.test(appName)) return "distraction";
  // Title-based check catches YouTube/Reddit/etc open in any browser
  if (DISTRACTION_NAME_RE.test(title)) return "distraction";
  if (RESEARCH_BUNDLES.has(bundleId)) return "research";
  if (FOCUS_NAME_RE.test(appName)) return "focus";
  // Fallback: any app whose name contains "browser" is research
  if (RESEARCH_NAME_RE.test(appName)) return "research";
  return "unknown";
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
  lastDisplayName: string; // comparison key: tab title for browsers, raw title for others
  lastCategory: WindowCategory;
  focusSec: number;
  driftSec: number;
  switchCount: number;
  pollTimer: ReturnType<typeof setInterval> | null;
  endTimer: ReturnType<typeof setTimeout> | null;
  // drift detection
  lastAppChangeTime: number;
  lastSwitchTime: number;
  distractionStartTime: number | null;
  distractionHistory: Record<string, number[]>;
  nudgeCooldownUntil: Partial<Record<string, number>>;
  milestonesFired: Set<string>;
}

let session: SessionState | null = null;
let settings: AppSettings = {
  ...DEFAULT_SETTINGS,
  ...(store.get("settings") as Partial<AppSettings> | undefined),
};
let mainWindow: BrowserWindow | null = null;
let titleSettleTimer: ReturnType<typeof setTimeout> | null = null;
let preCheckinHeight = 620;

// Cache the activeWin function after first dynamic import to avoid re-importing each tick
let activeWinFn: (() => Promise<unknown>) | null = null;

async function getActiveWin(): Promise<unknown> {
  if (!activeWinFn) {
    const mod = await import("active-win");
    activeWinFn = (mod as { default: () => Promise<unknown> }).default;
  }
  return activeWinFn();
}

function deriveGhostState(
  category: WindowCategory,
  driftSec: number,
): GhostMascotState {
  if (category === "inactive") return "sleepy";
  if (category === "distraction")
    return driftSec > 90 ? "concerned" : "thinking";
  if (category === "focus") return "calm";
  return "calm";
}

// ── Nudge helpers ─────────────────────────────────────────────────────────────

const NUDGE_COOLDOWNS: Record<string, number> = {
  // demo: short cooldowns for testability — restore to 3/5/5/10/10/10 min for production
  "in-app": 30 * 1000,
  "distraction-firm": 60 * 1000,
  "distraction-hard": 60 * 1000,
  "stuck-helpful": 90 * 1000,
  "idle-soft": 90 * 1000,
  "pattern-observational": 90 * 1000,
  "milestone-positive": Infinity,
};

function showCheckinNudge(
  win: BrowserWindow | null,
  payload: NudgePayload,
): void {
  if (!win || win.isDestroyed()) return;
  preCheckinHeight = win.getBounds().height;
  win.setSize(380, 300, true); // true = native macOS animate
  win.webContents.send(IPC.TRIGGER_NUDGE, payload);
}

function restoreMainWindow(win: BrowserWindow | null): void {
  if (!win || win.isDestroyed()) return;
  win.setSize(380, preCheckinHeight, true);
  win.webContents.send(IPC.NUDGE_DISMISSED);
}

function sessionContext() {
  if (!session) return {};
  const now = Date.now();
  const investedSec = Math.floor((now - session.startTime) / 1000);
  const remainingSec = Math.max(0, session.durationMin * 60 - investedSec);
  return { task: session.task, investedSec, remainingSec };
}

async function fireNudge(payload: NudgePayload): Promise<boolean> {
  if (!session) return false;
  const isInterrupt =
    payload.driftType === "distraction" || payload.driftType === "stuck";
  if (!isInterrupt && !mainWindow) return false;
  // Don't overwrite a nudge that's currently visible — user hasn't dismissed it yet
  if (isInterrupt && isNudgeWindowOpen()) return false;
  const now = Date.now();
  const cooldownExpiry = session.nudgeCooldownUntil[payload.type];
  if (cooldownExpiry !== undefined && now < cooldownExpiry) return false;

  session.nudgeCooldownUntil[payload.type] =
    now + (NUDGE_COOLDOWNS[payload.type] ?? 5 * 60 * 1000);

  const aiMessage = await generateNudgeMessage(session, payload.driftType);
  const finalPayload: NudgePayload = { ...payload, message: aiMessage };

  session.nudgeLog.push({
    message: finalPayload.message,
    driftType: payload.driftType,
    timestamp: now,
  });

  if (isInterrupt) {
    showInterruptNudge(finalPayload);
  } else {
    showCheckinNudge(mainWindow, finalPayload);
  }

  void speakNudge(finalPayload.message, settings);
  return true;
}

// ── Drift detection ───────────────────────────────────────────────────────────

async function checkFrequencyDrift(_now: number) {
  // Frequency data is tracked via session.switchLog/switchCount for stats.
  // No popup is fired — the inline in-app nudge component isn't wired yet,
  // and distraction/stuck nudges cover the meaningful drift cases.
  void _now;
}

async function checkDistractionDrift(
  appName: string,
  category: WindowCategory,
  now: number,
) {
  if (!session) return;

  if (category !== "distraction") {
    session.distractionStartTime = null;
    return;
  }

  if (session.distractionStartTime === null) {
    session.distractionStartTime = now;
    return;
  }

  const consecutiveSec = (now - session.distractionStartTime) / 1000;
  if (consecutiveSec < 0) return; // demo: 1m30s — raise to 180+ for production

  const windowStart = now - 10 * 60 * 1000;
  const history = session.distractionHistory[appName] ?? [];
  const recentOccurrences = history.filter((t) => t >= windowStart).length;

  // Record this occurrence (pruning old entries first) and reset timer so it only fires once per 60s-stretch
  session.distractionHistory[appName] = [
    ...history.filter((t) => t >= windowStart),
    now,
  ];
  session.distractionStartTime = now;

  if (recentOccurrences >= 2) {
    // 3rd+ time (0-indexed: 2 prior + this one = 3rd)
    await fireNudge({
      type: "distraction-firm",
      tier: 2,
      message: `third time on ${appName} in 10 minutes. your task is still waiting.`,
      driftType: "distraction",
      context: {
        appName,
        driftDurationSec: Math.round(consecutiveSec),
        occurrences: recentOccurrences + 1,
        ...sessionContext(),
      },
    });
  } else {
    await fireNudge({
      type: "distraction-firm",
      tier: 2,
      message: `you've been on ${appName} for a bit. still working on "${session.task}"?`,
      driftType: "distraction",
      context: {
        appName,
        driftDurationSec: Math.round(consecutiveSec),
        occurrences: recentOccurrences + 1,
        ...sessionContext(),
      },
    });
  }
}

async function checkStuckDrift(now: number) {
  if (!session) return;
  const windowStart = now - 5 * 60 * 1000;
  const recent = session.switchLog.filter((s) => s.timestamp >= windowStart);
  if (recent.length < 10) return;

  const distractionCount = recent.filter(
    (s) => s.category === "distraction",
  ).length;
  if (distractionCount / recent.length > 0.2) return;

  const fired = await fireNudge({
    type: "stuck-helpful",
    tier: 2,
    message: `you've been cycling apps a lot — what's snagging you?`,
    driftType: "stuck",
  });

  // Only open ghost chat once per cooldown — not on every 2s tick
  if (fired) {
    mainWindow?.webContents.send(IPC.OPEN_GHOST_CHAT, {
      trigger: "stuck",
    } as OpenGhostChatPayload);
    const ghostMsg: GhostMessagePayload = {
      message: `noticed you've been cycling between apps — what's blocking you on "${session.task}"?`,
      trigger: "stuck_drift",
      timestamp: now,
    };
    mainWindow?.webContents.send(IPC.GHOST_MESSAGE, ghostMsg);
    session.chatHistory.push({
      role: "ghost",
      content: ghostMsg.message,
      timestamp: now,
    });
  }
}

async function checkInactivity(_now: number) {
  if (!session) return;
  const idleSec = powerMonitor.getSystemIdleTime();
  if (idleSec >= settings.inactivityThreshold) {
    await fireNudge({
      type: "idle-soft",
      tier: 2,
      message: `still there? no activity for ${Math.round(idleSec / 60)} minutes.`,
      driftType: "distraction",
    });
  }
}

async function checkMilestone(now: number) {
  if (!session) return;
  if (session.milestonesFired.has("25min")) return;
  if (session.lastCategory !== "focus") return;
  if (now - session.lastSwitchTime >= 25 * 60 * 1000) {
    session.milestonesFired.add("25min");
    await fireNudge({
      type: "milestone-positive",
      tier: 2,
      message: `25 minutes of deep focus — that's your best streak. keep it going.`,
      driftType: "frequency",
    });
  }
}

// ── Poll loop ─────────────────────────────────────────────────────────────────

function buildSessionUpdate(
  elapsedSec: number,
  appName: string,
  bundleId: string,
  title: string,
  displayName: string,
  category: WindowCategory,
): SessionUpdate {
  if (!session) throw new Error("no session");
  return {
    currentApp: displayName,
    currentAppProcess: appName,
    currentAppBundle: bundleId,
    currentAppTitle: title,
    category,
    switchCount: session.switchCount,
    elapsedSec,
    focusSec: session.focusSec,
    driftSec: session.driftSec,
    ghostState: deriveGhostState(category, session.driftSec),
    recentSwitches: session.switchLog.slice(-8).reverse(),
  };
}

async function pollActiveWindow() {
  if (!session || !mainWindow) return;
  const now = Date.now();
  const elapsedSec = Math.floor((now - session.startTime) / 1000);

  try {
    const win = (await getActiveWin()) as
      | { owner: { name: string; bundleId?: string }; title?: string }
      | undefined;

    if (!win) {
      // No focused window — still advance the timer so the UI doesn't freeze
      mainWindow.webContents.send(
        IPC.SESSION_UPDATE,
        buildSessionUpdate(
          elapsedSec,
          session.lastApp,
          "",
          "",
          session.lastDisplayName,
          session.lastCategory,
        ),
      );
      return;
    }

    const appName = win.owner.name;
    const bundleId = win.owner.bundleId ?? "";
    const title = win.title ?? "";
    const displayName = extractTabTitle(title, appName);

    const trueCategory = categorize(appName, bundleId, title);
    let category = trueCategory;

    // For browsers: use extracted tab title; for everything else (Discord, etc.): use raw OS title.
    // This lets us detect both browser tab switches and Discord channel switches via one comparison.
    const comparisonName = displayName !== appName ? displayName : title;

    const appChanged = appName !== session.lastApp;
    const titleChanged =
      !appChanged &&
      comparisonName !== session.lastDisplayName &&
      category !== "focus" && // ignore VSCode/editor file switches
      comparisonName.length >= 3; // ignore empty/loading states

    // Always advance the tracking name so the next tick compares against the latest value
    session.lastDisplayName = comparisonName;

    if (appChanged) {
      // Cancel any pending title-settle for the previous app
      if (titleSettleTimer) {
        clearTimeout(titleSettleTimer);
        titleSettleTimer = null;
      }
      session.switchLog.push({ app: appName, category, timestamp: now, title });
      session.switchCount += 1;
      session.lastApp = appName;
      session.lastCategory = category;
      session.lastAppChangeTime = now;
      session.lastSwitchTime = now;
      session.distractionStartTime = null;
    } else if (titleChanged) {
      // Debounce: wait 1.5 s for the title to settle before recording (handles "Connecting…" flicker)
      if (titleSettleTimer) clearTimeout(titleSettleTimer);
      const capturedApp = appName;
      const capturedCategory = category;
      const capturedTitle = title;
      titleSettleTimer = setTimeout(() => {
        titleSettleTimer = null;
        if (!session) return;
        const t = Date.now();
        session.switchLog.push({
          app: capturedApp,
          category: capturedCategory,
          timestamp: t,
          title: capturedTitle,
        });
        session.switchCount += 1;
        session.lastAppChangeTime = t;
        session.lastSwitchTime = t;
        // Don't reset distractionStartTime here — channel switches within Discord shouldn't
        // restart the 90s distraction accumulation. checkDistractionDrift handles resets.
      }, 1500);
    }

    // Override category to inactive if no window change for inactivity threshold
    if (
      now - session.lastAppChangeTime >=
      settings.inactivityThreshold * 1000
    ) {
      category = "inactive";
    }

    // Accumulate focus/drift in 2-second ticks
    if (category === "focus" || category === "research") {
      session.focusSec += 2;
    } else if (category === "distraction") {
      session.driftSec += 2;
    }

    mainWindow.webContents.send(
      IPC.SESSION_UPDATE,
      buildSessionUpdate(
        elapsedSec,
        appName,
        bundleId,
        title,
        displayName,
        category,
      ),
    );

    if (settings.nudgeEnabled) {
      await checkFrequencyDrift(now);
      await checkDistractionDrift(appName, trueCategory, now);
      await checkStuckDrift(now);
      await checkInactivity(now);
      await checkMilestone(now);
    }

    // Persist live session state so teammates can read it
    store.set("currentSession", {
      task: session.task,
      durationMin: session.durationMin,
      startTime: session.startTime,
      switchLog: session.switchLog,
      nudgeLog: session.nudgeLog,
      chatHistory: session.chatHistory,
    });
  } catch {
    // active-win throws on permission error — still advance the timer
    if (session && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        IPC.SESSION_UPDATE,
        buildSessionUpdate(
          elapsedSec,
          session.lastApp,
          "",
          "",
          session.lastDisplayName,
          session.lastCategory,
        ),
      );
    }
  }
}

// ── Recap & end session ───────────────────────────────────────────────────────

function buildRecap(currentSession: SessionState): SessionRecapPayload {
  const appTime = new Map<
    string,
    { seconds: number; category: WindowCategory }
  >();
  const entries = currentSession.switchLog;
  for (let i = 0; i < entries.length; i++) {
    const from = entries[i].timestamp;
    const to = i + 1 < entries.length ? entries[i + 1].timestamp : Date.now();
    const secs = Math.max(0, Math.floor((to - from) / 1000));
    const existing = appTime.get(entries[i].app);
    if (existing) {
      existing.seconds += secs;
    } else {
      appTime.set(entries[i].app, {
        seconds: secs,
        category: entries[i].category,
      });
    }
  }

  const appBreakdown = Array.from(appTime.entries())
    .map(([appName, { seconds, category }]) => ({
      app: appName,
      category,
      seconds,
    }))
    .sort((a, b) => b.seconds - a.seconds);

  const totalSec = Math.max(
    1,
    currentSession.focusSec + currentSession.driftSec,
  );
  const focusPct = Math.round((currentSession.focusSec / totalSec) * 100);
  let insight: string;
  if (focusPct >= 80) {
    insight = `Strong session - you stayed focused ${focusPct}% of the time on "${currentSession.task}". Keep that streak going.`;
  } else if (focusPct >= 60) {
    insight = `Decent focus at ${focusPct}% on "${currentSession.task}". A few drifts but you pulled back. Try closing distracting tabs before the next session.`;
  } else {
    insight = `Tough one - only ${focusPct}% focus time. Identify what pulled you away from "${currentSession.task}" and eliminate it before the next session.`;
  }

  return {
    task: currentSession.task,
    durationMin: currentSession.durationMin,
    focusSec: currentSession.focusSec,
    driftSec: currentSession.driftSec,
    totalSwitches: currentSession.switchCount,
    nudgesReceived: currentSession.nudgeLog.length,
    nudgesDismissedAsBreak: 0,
    appBreakdown,
    insight,
    switchLog: currentSession.switchLog,
  };
}

function endSession() {
  if (!session) return;
  const endedSession = session;
  if (endedSession.pollTimer) clearInterval(endedSession.pollTimer);
  if (endedSession.endTimer) clearTimeout(endedSession.endTimer);
<<<<<<< HEAD
  if (titleSettleTimer) {
    clearTimeout(titleSettleTimer);
    titleSettleTimer = null;
  }
=======
  if (titleSettleTimer) { clearTimeout(titleSettleTimer); titleSettleTimer = null; }
  void stopNudgeSpeech();
>>>>>>> 6aa41db (refactor(new elevenlabs))
  session = null;

  void (async () => {
    const recap = buildRecap(endedSession);

    // Transition immediately with the static insight so the UI doesn't feel frozen
    mainWindow?.webContents.send(IPC.SESSION_RECAP, recap);

    // Fetch AI insight in the background, then push an update so the insight refreshes in place
    recap.insight = await generateInsight(endedSession);
    void recordSessionMemory(recap, endedSession.chatHistory);

    const history =
      (store.get("sessionHistory") as SessionRecapPayload[] | undefined) ?? [];
    store.set("sessionHistory", [...history, recap].slice(-50));
    store.delete("currentSession");
    mainWindow?.webContents.send(IPC.SESSION_RECAP, recap);
  })();
}

// ── IPC handlers ──────────────────────────────────────────────────────────────

function registerIPC() {
  ipcMain.handle(IPC.START_SESSION, (_e, payload: StartSessionPayload) => {
    if (session) {
      if (session.pollTimer) clearInterval(session.pollTimer);
      if (session.endTimer) clearTimeout(session.endTimer);
    }
    const now = Date.now();
    session = {
      task: payload.task,
      durationMin: payload.durationMin,
      startTime: now,
      switchLog: [],
      nudgeLog: [],
      chatHistory: [],
      lastApp: "",
      lastDisplayName: "",
      lastCategory: "unknown",
      focusSec: 0,
      driftSec: 0,
      switchCount: 0,
      pollTimer: setInterval(pollActiveWindow, 2000),
      endTimer: setTimeout(endSession, payload.durationMin * 60 * 1000),
      lastAppChangeTime: now,
      lastSwitchTime: now,
      distractionStartTime: null,
      distractionHistory: {},
      nudgeCooldownUntil: {},
      milestonesFired: new Set(),
    };
    store.set("currentSession", {
      task: session.task,
      durationMin: session.durationMin,
      startTime: session.startTime,
      switchLog: [],
      nudgeLog: [],
      chatHistory: [],
    });
  });

  ipcMain.handle(IPC.END_SESSION, () => {
    endSession();
  });

  ipcMain.handle(
    IPC.CHAT_MESSAGE,
    async (_e, payload: { message: string; chatHistory: ChatEntry[] }) => {
      if (!session) return;

      const activeSession = session;
      const userEntry: ChatEntry = {
        role: "user",
        content: payload.message,
        timestamp: Date.now(),
      };
      activeSession.chatHistory.push(userEntry);

      const incomingHistory = payload.chatHistory ?? [];
      const historyForModel =
        incomingHistory.length > 0
          ? incomingHistory
          : activeSession.chatHistory;
      const replyText = await generateChatResponse(
        activeSession,
        payload.message,
        historyForModel,
        deviceId,
      );
      const ghostEntry: ChatEntry = {
        role: "ghost",
        content: replyText,
        timestamp: Date.now(),
      };
      activeSession.chatHistory.push(ghostEntry);

      mainWindow?.webContents.send(IPC.CHAT_RESPONSE, {
        message: replyText,
        timestamp: ghostEntry.timestamp,
      });
    },
  );

  ipcMain.handle(IPC.DISMISS_NUDGE, () => {
    void stopNudgeSpeech();
    if (isNudgeWindowOpen()) {
      closeNudgeWindow();
    } else {
      restoreMainWindow(mainWindow);
    }
  });

  ipcMain.handle(IPC.UPDATE_SETTINGS, (_e, payload: Partial<AppSettings>) => {
    settings = { ...settings, ...payload };
    store.set("settings", settings);
    if (mainWindow && "alwaysOnTop" in payload) {
      mainWindow.setAlwaysOnTop(settings.alwaysOnTop);
    }
  });

  // DEBUG: Person 3 can call window.electronAPI.debugNudge('distraction-firm') from DevTools
  // to trigger any popup type without waiting for real drift to fire.
  ipcMain.handle(IPC.DEBUG_NUDGE, (_e, type: NudgeType) => {
    const fallbacks: Record<NudgeType, NudgePayload> = {
      "in-app": {
        type: "in-app",
        tier: 1,
        message:
          "you've been on YouTube for a bit. still working on your task?",
        driftType: "distraction",
        context: {
          appName: "YouTube",
          driftDurationSec: 45,
          ...sessionContext(),
        },
      },
      "distraction-firm": {
        type: "distraction-firm",
        tier: 2,
        message: "you've been here for 2 minutes. your task is still waiting.",
        driftType: "distraction",
        context: {
          appName: "Twitter",
          driftDurationSec: 120,
          occurrences: 3,
          ...sessionContext(),
        },
      },
      "distraction-hard": {
        type: "distraction-hard",
        tier: 2,
        message:
          "past-you set this session for a reason. future-you will thank you for getting back.",
        driftType: "distraction",
        context: {
          appName: "Steam",
          driftDurationSec: 180,
          ...sessionContext(),
        },
      },
      "stuck-helpful": {
        type: "stuck-helpful",
        tier: 2,
        message:
          "you've been on the same line of code for 8 minutes — but i can help if you want to talk it out.",
        driftType: "stuck",
        context: { ...sessionContext() },
      },
      "idle-soft": {
        type: "idle-soft",
        tier: 2,
        message:
          "no movement for 4 minutes. taking a quick break, or did i lose you?",
        driftType: "distraction",
        context: { ...sessionContext() },
      },
      "pattern-observational": {
        type: "pattern-observational",
        tier: 2,
        message: "want me to block Twitter for the rest of the session?",
        driftType: "distraction",
        context: { appName: "Twitter", occurrences: 3, ...sessionContext() },
      },
      "milestone-positive": {
        type: "milestone-positive",
        tier: 2,
        message:
          "zero switches in 25 minutes. this might be your best focus stretch this week.",
        driftType: "frequency",
        context: { ...sessionContext() },
      },
    };
    const payload = fallbacks[type] ?? fallbacks["in-app"];
    const isInterrupt =
      payload.driftType === "distraction" || payload.driftType === "stuck";
    if (isInterrupt) {
      showInterruptNudge(payload);
    } else {
      showCheckinNudge(mainWindow, payload);
    }
  });
}

// ── Window controls ───────────────────────────────────────────────────────────

ipcMain.on("WINDOW_CLOSE", () => mainWindow?.close());
ipcMain.on("WINDOW_MINIMIZE", () => mainWindow?.minimize());
ipcMain.on("WINDOW_COLLAPSE", () => mainWindow?.setSize(380, 80, true));
ipcMain.on("WINDOW_EXPAND", () => mainWindow?.setSize(380, 620, true));

// ── Window ────────────────────────────────────────────────────────────────────

const createWindow = () => {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 380,
    height: 620,
    alwaysOnTop: true,
    titleBarStyle: process.platform === "darwin" ? "hidden" : "default",
    trafficLightPosition:
      process.platform === "darwin" ? { x: 10, y: 11 } : undefined,
    resizable: true,
    movable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
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

  // mainWindow.webContents.openDevTools();
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
};

app.on("ready", async () => {
  await initializeAIOrchestrator();
  registerIPC();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
