import "dotenv/config";

import { randomUUID } from "crypto";
import {
  app,
  BrowserWindow,
  ipcMain,
  powerMonitor,
  Menu,
  shell,
} from "electron";
import { spawn } from "child_process";
import { extractTabTitle } from "./main/get-browser-tab";
import {
  classifyActivity,
  isBrowserApp,
  extractSiteName,
  extractTitleKeywords,
} from "./main/classification/activityClassifier";
import type {
  ActivityCategory,
  SessionCorrection,
} from "./shared/classificationTypes";
import {
  showInterruptNudge,
  closeNudgeWindow,
  isNudgeWindowOpen,
  isNudgeWindowSender,
} from "./main/nudge-window";
import path from "path";
import started from "electron-squirrel-startup";
import Store from "electron-store";
import {
  IPC,
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
} from "./shared/ipc-contract";
import { registerWindowControls } from "./main/window/windowControls";
import {
  loadSettings,
  applySettingsUpdate,
  getSettingsSnapshot,
} from "./main/settings/settingsService";
import { buildRecap } from "./main/session/recapService";
import type { SessionState } from "./main/session/sessionTypes";
import {
  NUDGE_COOLDOWNS,
  DISTRACTION_FIRM_SEC,
  PATTERN_VISIT_COUNT,
  PATTERN_WINDOW_SEC,
  STUCK_SWITCH_COUNT,
  STUCK_WINDOW_SEC,
  STUCK_RECENCY_SEC,
  IDLE_TRIGGER_SEC,
  MILESTONE_STREAK_SEC,
} from "./main/drift/driftConstants";
import {
  initializeAIOrchestrator,
  generateChatResponse,
  generateInsight,
  generateNudgeMessage,
  recordSessionMemory,
} from "./main/ai/aiOrchestrator";
import { speakNudge, stopNudgeSpeech } from "./main/voice/elevenLabsService";

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

// ── Category mapping ──────────────────────────────────────────────────────────

function mapActivityToWindow(ac: ActivityCategory): WindowCategory {
  switch (ac) {
    case "focus":
    case "supportive":
      return "focus";
    case "distraction":
    case "hard-distraction":
      return "distraction";
    case "neutral":
    case "needs-clarification":
    default:
      return "research";
  }
}

// ── Session state ─────────────────────────────────────────────────────────────

let session: SessionState | null = null;
let settings: AppSettings = loadSettings(store);
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

async function fireNudge(
  payload: NudgePayload,
  force = false,
): Promise<boolean> {
  if (!session) return false;
  const isInterrupt = payload.tier === 2;
  if (!isInterrupt && !mainWindow) return false;
  // Non-force interrupts are blocked if a popup is already visible.
  // idle-soft (force=true) closes and replaces whatever is showing.
  if (isInterrupt && !force && isNudgeWindowOpen()) return false;

  const now = Date.now();
  const cooldownExpiry = session.nudgeCooldownUntil[payload.type];
  if (cooldownExpiry !== undefined && now < cooldownExpiry) return false;

  const sensitivityMult =
    settings.nudgeSensitivity === "gentle"
      ? 2
      : settings.nudgeSensitivity === "strict"
        ? 0.5
        : 1;
  session.nudgeCooldownUntil[payload.type] =
    now + (NUDGE_COOLDOWNS[payload.type] ?? 5 * 60 * 1000) * sensitivityMult;

  const aiMessage = await generateNudgeMessage(session, payload.driftType);
  const finalPayload: NudgePayload = { ...payload, message: aiMessage };

  session.nudgeLog.push({
    message: finalPayload.message,
    driftType: payload.driftType,
    timestamp: now,
  });

  console.debug("[Nudge] fired", {
    type: finalPayload.type,
    driftType: finalPayload.driftType,
    messageLen: finalPayload.message?.length ?? 0,
  });

  if (isInterrupt) {
    // Pass force so showInterruptNudge can close an existing popup for idle-soft
    showInterruptNudge(finalPayload, force);
  } else {
    showCheckinNudge(mainWindow, finalPayload);
  }

  // Audible ping to alert the user that a nudge arrived. Keep this
  // host-level so we don't duplicate pings from other places.
  try {
    shell.beep();
  } catch (e) {
    console.debug("[Voice] shell.beep failed", e);
  }

  // On macOS some systems won't make an audible beep; attempt a stronger
  // fallback by playing a short system sound if available.
  if (process.platform === "darwin") {
    try {
      // common system sounds: /System/Library/Sounds/Glass.aiff
      const soundPath = "/System/Library/Sounds/Glass.aiff";
      // spawn afplay asynchronously; don't await
      spawn("afplay", [soundPath]);
    } catch (e) {
      console.debug("[Voice] macOS afplay fallback failed", e);
    }
  }

  // Fire off TTS according to the user's settings. This returns immediately.
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
  processName: string, // OS app name — used for blockedApps lookup
  distractionKey: string, // site name for browsers, app name for desktop
  category: WindowCategory,
  activityCategory: ActivityCategory,
  now: number,
) {
  if (!session) return;

  if (category !== "distraction") {
    session.distractionStartTime = null;
    return;
  }

  const isHard = activityCategory === "hard-distraction";
  const blockedUntil =
    session.blockedApps.get(distractionKey) ??
    session.blockedApps.get(processName);
  const isBlocked = blockedUntil !== undefined && now < blockedUntil;

  if (session.distractionStartTime === null) {
    // Hard distraction and blocked apps fire quickly — pre-subtract threshold to trigger next tick
    session.distractionStartTime =
      isHard || isBlocked ? now - DISTRACTION_FIRM_SEC * 1000 : now;
    return;
  }

  const consecutiveSec = (now - session.distractionStartTime) / 1000;
  if (consecutiveSec < (isHard || isBlocked ? 1 : DISTRACTION_FIRM_SEC)) return;

  const windowStart = now - PATTERN_WINDOW_SEC * 1000;
  const history = session.distractionHistory[distractionKey] ?? [];
  const recentOccurrences = history.filter((t) => t >= windowStart).length;

  // Record occurrence and reset timer — prevents re-fire until threshold elapses again
  session.distractionHistory[distractionKey] = [
    ...history.filter((t) => t >= windowStart),
    now,
  ];
  session.distractionStartTime = now;

  if (isHard) {
    await fireNudge({
      type: "distraction-hard",
      tier: 2,
      message: `${distractionKey.toLowerCase()} — eyes on me. back to "${session.task}".`,
      driftType: "distraction",
      context: {
        appName: distractionKey,
        driftDurationSec: Math.round(consecutiveSec),
        ...sessionContext(),
      },
    });
  } else if (recentOccurrences >= PATTERN_VISIT_COUNT) {
    await fireNudge({
      type: "pattern-observational",
      tier: 2,
      message: `${distractionKey.toLowerCase()} again — want me to block it for the rest of the session?`,
      driftType: "distraction",
      context: {
        appName: distractionKey,
        driftDurationSec: Math.round(consecutiveSec),
        occurrences: recentOccurrences + 1,
        ...sessionContext(),
      },
    });
  } else {
    const blockMsg =
      isBlocked && blockedUntil
        ? `${distractionKey.toLowerCase()} is blocked — back to "${session.task}"?`
        : `you've been on ${distractionKey.toLowerCase()} for ${Math.round(consecutiveSec)}s. "${session.task}" is still waiting.`;
    await fireNudge({
      type: "distraction-firm",
      tier: 2,
      message: blockMsg,
      driftType: "distraction",
      context: {
        appName: distractionKey,
        driftDurationSec: Math.round(consecutiveSec),
        occurrences: 1,
        blockUntil: blockedUntil,
        ...sessionContext(),
      },
    });
  }
}

async function checkClarification(
  appName: string,
  bundleId: string,
  tabTitle: string,
) {
  if (!session) return;
  const clarifyKey = `${appName}:${tabTitle}`;
  if (session.pendingClarifications.has(clarifyKey)) return;
  session.pendingClarifications.add(clarifyKey);

  const siteName = extractSiteName(tabTitle);
  const titleKeywords = extractTitleKeywords(tabTitle, siteName);
  const displayLabel = siteName
    ? tabTitle.replace(/\s*[-|]\s*\w[\w\s]*$/i, "").trim() || tabTitle
    : tabTitle;

  await fireNudge({
    type: "clarify",
    tier: 1,
    message: `looks like it could be related — count it as focus time?`,
    driftType: "frequency",
    context: {
      appName: displayLabel.slice(0, 45),
      clarificationPayload: {
        isBrowser: isBrowserApp(appName, bundleId),
        appName,
        siteName,
        titleKeywords,
      },
      ...sessionContext(),
    },
  });
}

async function checkStuckDrift(now: number) {
  if (!session) return;

  // Prune entries older than the rolling window
  session.stuckRollingLog = session.stuckRollingLog.filter(
    (s) => s.timestamp >= now - STUCK_WINDOW_SEC * 1000,
  );

  if (session.stuckRollingLog.length < STUCK_SWITCH_COUNT) return;

  // Most recent switch must be recent — user is actively cycling right now
  const mostRecent =
    session.stuckRollingLog[session.stuckRollingLog.length - 1];
  if (now - mostRecent.timestamp > STUCK_RECENCY_SEC * 1000) return;

  // Fewer than 20% distraction switches — this is a focus/stuck pattern, not distraction drift
  const distractionCount = session.stuckRollingLog.filter(
    (s) => s.category === "distraction",
  ).length;
  if (distractionCount / session.stuckRollingLog.length >= 0.2) return;

  // Build a compact sequence of categories (remove consecutive duplicates)
  const recent = session.stuckRollingLog;
  const seq: WindowCategory[] = [];
  for (const s of recent) {
    if (seq.length === 0 || seq[seq.length - 1] !== s.category)
      seq.push(s.category);
  }

  // Count alternations between focus and non-focus that indicate cycling
  let alternations = 0;
  for (let i = 0; i + 1 < seq.length; i++) {
    const a = seq[i];
    const b = seq[i + 1];
    if (
      (a === "focus" && (b === "research" || b === "unknown")) ||
      (b === "focus" && (a === "research" || a === "unknown"))
    ) {
      alternations++;
    }
  }

  // If we see 3 or more alternations within the window, consider it stuck
  if (alternations < 3) return;

  const fired = await fireNudge({
    type: "stuck-helpful",
    tier: 2,
    message: `you've been cycling apps — what's snagging you?`,
    driftType: "stuck",
    context: { ...sessionContext() },
  });

  // Clear the log after firing so stuck can't re-fire on the same switch burst
  if (fired) session.stuckRollingLog = [];
}

async function checkInactivity(_now: number) {
  if (!session) return;
  const idleSec = powerMonitor.getSystemIdleTime();

  // Reset flag as soon as the user is active again
  if (idleSec < 5) {
    session.idleSoftFired = false;
    return;
  }

  // Fire once per idle stretch; force-replaces any existing popup
  if (idleSec >= IDLE_TRIGGER_SEC && !session.idleSoftFired) {
    session.idleSoftFired = true;
    await fireNudge(
      {
        type: "idle-soft",
        tier: 2,
        message: `still there? you've been away for ${Math.round(idleSec)}s.`,
        driftType: "distraction",
        context: { ...sessionContext() },
      },
      true /* force — idle overrides any existing popup */,
    );
  }
}

async function checkMilestone(now: number) {
  if (!session) return;
  if (session.milestonesFired.has("25min")) return;

  if (session.lastCategory !== "focus") {
    // Reset streak whenever the user leaves a focus app
    session.focusStreakStart = null;
    return;
  }

  // Start the streak timer on first focus tick
  if (session.focusStreakStart === null) {
    session.focusStreakStart = now;
    return;
  }

  if (now - session.focusStreakStart >= MILESTONE_STREAK_SEC * 1000) {
    session.milestonesFired.add("25min");
    await fireNudge({
      type: "milestone-positive",
      tier: 2,
      message: `${MILESTONE_STREAK_SEC}s of continuous focus — solid work. keep it going.`,
      driftType: "frequency",
      context: { ...sessionContext() },
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

    // Classify using session-aware classifier
    const tabTitle = displayName !== appName ? displayName : title;
    const classification = classifyActivity({
      sessionGoal: session.task,
      appName,
      bundleId,
      windowTitle: title,
      tabTitle,
      sessionCorrections: session.sessionCorrections,
    });
    const activityCategory = classification.category;
    const trueCategory = mapActivityToWindow(activityCategory);
    let category = trueCategory;

    // Distraction tracking key: site name for browsers, app name for desktop apps
    const isCurrentlyBrowser = isBrowserApp(appName, bundleId);
    const distractionKey = isCurrentlyBrowser
      ? (extractSiteName(tabTitle) ?? tabTitle.slice(0, 50))
      : appName;

    // For browsers: use extracted tab title; for everything else (Discord, etc.): use raw OS title.
    // This lets us detect both browser tab switches and Discord channel switches via one comparison.
    const comparisonName = displayName !== appName ? displayName : title;

    const appChanged = appName !== session.lastApp;
    const titleChanged =
      !appChanged &&
      comparisonName !== session.lastDisplayName &&
      category !== "focus" && // ignore focus-app file switches
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
      session.stuckRollingLog.push({ app: appName, category, timestamp: now });
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
        session.stuckRollingLog.push({
          app: capturedApp,
          category: capturedCategory,
          timestamp: t,
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

    // Accumulate focus/drift in 1-second ticks
    if (category === "focus" || category === "research") {
      session.focusSec += 1;
    } else if (category === "distraction") {
      session.driftSec += 1;
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
      await checkDistractionDrift(
        appName,
        distractionKey,
        trueCategory,
        activityCategory,
        now,
      );
      if (activityCategory === "needs-clarification") {
        await checkClarification(appName, bundleId, tabTitle);
      }
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

function endSession() {
  if (!session) return;
  const endedSession = session;
  if (endedSession.pollTimer) clearInterval(endedSession.pollTimer);
  if (endedSession.endTimer) clearTimeout(endedSession.endTimer);
  if (titleSettleTimer) {
    clearTimeout(titleSettleTimer);
    titleSettleTimer = null;
  }
  void stopNudgeSpeech();
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
      pollTimer: setInterval(pollActiveWindow, 1000),
      endTimer: setTimeout(endSession, payload.durationMin * 60 * 1000),
      lastAppChangeTime: now,
      lastSwitchTime: now,
      distractionStartTime: null,
      distractionHistory: {},
      nudgeCooldownUntil: {},
      milestonesFired: new Set(),
      stuckRollingLog: [],
      idleSoftFired: false,
      focusStreakStart: null,
      blockedApps: new Map(),
      sessionCorrections: [],
      pendingClarifications: new Set(),
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

  ipcMain.handle(IPC.DISMISS_NUDGE, (event) => {
    if (isNudgeWindowSender(event.sender)) {
      closeNudgeWindow();
    } else {
      restoreMainWindow(mainWindow);
    }
  });

  ipcMain.handle(IPC.UPDATE_SETTINGS, (_e, payload: Partial<AppSettings>) => {
    settings = applySettingsUpdate(settings, store, payload, mainWindow);
  });

  ipcMain.handle(IPC.GET_SETTINGS, () => getSettingsSnapshot(settings));

  ipcMain.handle(IPC.REQUEST_GHOST_CHAT, (_e, reason?: string) => {
    mainWindow?.webContents.send(IPC.OPEN_GHOST_CHAT, {
      trigger: "stuck",
      prefillMessage: reason,
    });
  });

  ipcMain.handle(IPC.SNOOZE_NUDGE, (_e, appName?: string) => {
    if (!session) return;
    const snoozeUntil = Date.now() + 60 * 1000;
    // Extend distraction cooldowns so neither distraction-firm nor pattern fires for 60s
    session.nudgeCooldownUntil["distraction-firm"] = Math.max(
      session.nudgeCooldownUntil["distraction-firm"] ?? 0,
      snoozeUntil,
    );
    session.nudgeCooldownUntil["pattern-observational"] = Math.max(
      session.nudgeCooldownUntil["pattern-observational"] ?? 0,
      snoozeUntil,
    );
    // Reset entry timer so the 8s window starts fresh after the snooze expires
    if (appName) session.distractionStartTime = null;
  });

  ipcMain.handle(IPC.BLOCK_APP, (_e, appName: string, until: number) => {
    if (!session) return;
    session.blockedApps.set(appName, until);
    // Reset distraction timer so the 1s threshold fires immediately on next visit
    session.distractionStartTime = null;
  });

  ipcMain.handle(IPC.SET_WINDOW_DIM, (_e, dimmed: boolean) => {
    mainWindow?.setOpacity(dimmed ? 0.8 : 1.0);
  });

  ipcMain.handle(IPC.CLASSIFY_CORRECTION, (_e, payload: SessionCorrection) => {
    if (!session) return;
    // Remove any conflicting correction for the same app/site before inserting
    session.sessionCorrections = session.sessionCorrections.filter((c) => {
      if (!payload.isBrowser && !c.isBrowser)
        return c.appName !== payload.appName;
      if (payload.isBrowser && c.isBrowser)
        return c.siteName !== payload.siteName;
      return true;
    });
    session.sessionCorrections.push(payload);
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
      clarify: {
        type: "clarify",
        tier: 1,
        message: "looks like it could be related — count it as focus time?",
        driftType: "frequency",
        context: {
          appName: "YouTube tutorial",
          clarificationPayload: {
            isBrowser: true,
            siteName: "youtube",
            titleKeywords: ["tutorial"],
          },
          ...sessionContext(),
        },
      },
    };
    const payload = fallbacks[type] ?? fallbacks["in-app"];

    // If there's no active session, fall back to the old debug behavior that
    // directly shows the nudge window + plays sound so devs can test without
    // starting a session. If a session exists, route through fireNudge so
    // the normal pipeline (cooldowns, logs, TTS) is used.
    if (!session) {
      const isInterrupt =
        payload.driftType === "distraction" || payload.driftType === "stuck";
      console.debug(
        "[DEBUG_NUDGE] no session — showing debug nudge directly",
        payload.type,
      );
      if (isInterrupt) {
        showInterruptNudge(payload);
      } else {
        if (mainWindow && !mainWindow.isDestroyed())
          showCheckinNudge(mainWindow, payload);
      }

      try {
        shell.beep();
      } catch {
        /* ignore */
      }
      if (process.platform === "darwin") {
        try {
          spawn("afplay", ["/System/Library/Sounds/Glass.aiff"]);
        } catch {
          /* ignore */
        }
      }

      // attempt speech according to current settings (may be disabled)
      void speakNudge(payload.message, settings);
      return;
    }

    // Use the same fireNudge pipeline so debug nudges honor cooldowns, TTS,
    // and logging just like real drift events when a session exists.
    void fireNudge(payload).catch((err) =>
      console.error("[DEBUG_NUDGE] failed to fire nudge:", err),
    );
  });
}

// ── Window controls ───────────────────────────────────────────────────────────

registerWindowControls(() => mainWindow);

// ── Window ────────────────────────────────────────────────────────────────────

const createWindow = () => {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 380,
    height: 620,
    alwaysOnTop: true,
    frame: process.platform === "darwin",
    titleBarStyle: process.platform === "darwin" ? "hidden" : undefined,
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

  //mainWindow.webContents.openDevTools(); Open devtools
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
