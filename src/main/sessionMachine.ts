import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type {
  SwitchEntry,
  ChatEntry,
  NudgeEntry,
  WindowCategory,
  GhostMascotState,
} from "@shared/ipc-contract";

export type SessionState = "IDLE" | "ACTIVE" | "DRIFTING" | "INACTIVE" | "RECAP";

interface SessionData {
  id: string;
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

const FOCUS_BUNDLES = new Set([
  "com.microsoft.VSCode",
  "com.apple.dt.Xcode",
  "com.jetbrains.intellij",
  "com.apple.Terminal",
  "com.googlecode.iterm2",
  "com.figma.Desktop",
  "com.sublimetext.4",
  "io.cursor.Cursor",
  "com.todesktop.230313mzl4w4u92",
]);

const DISTRACTION_BUNDLES = new Set([
  "com.hnc.Discord",
  "com.spotify.client",
  "com.apple.TV",
]);

const DISTRACTION_NAME_RE = /youtube|netflix|twitch|tiktok|instagram|twitter|reddit/i;

const RESEARCH_BUNDLES = new Set([
  "com.google.Chrome",
  "org.mozilla.firefox",
  "com.apple.Safari",
  "com.microsoft.edgemac",
]);

export function categorize(appName: string, bundleId: string): WindowCategory {
  if (FOCUS_BUNDLES.has(bundleId)) return "focus";
  if (DISTRACTION_BUNDLES.has(bundleId)) return "distraction";
  if (DISTRACTION_NAME_RE.test(appName)) return "distraction";
  if (RESEARCH_BUNDLES.has(bundleId)) return "research";
  return "unknown";
}

export function deriveGhostState(category: WindowCategory, driftSec: number): GhostMascotState {
  if (category === "distraction") return driftSec > 90 ? "concerned" : "thinking";
  return "calm";
}

export interface SessionUpdate {
  currentApp: string;
  currentAppBundle: string;
  category: WindowCategory;
  switchCount: number;
  elapsedSec: number;
  focusSec: number;
  driftSec: number;
  ghostState: GhostMascotState;
  recentSwitches: SwitchEntry[];
}

export interface SessionRecapPayload {
  task: string;
  durationMin: number;
  focusSec: number;
  driftSec: number;
  totalSwitches: number;
  nudgesReceived: number;
  nudgesDismissedAsBreak: number;
  appBreakdown: Array<{ app: string; category: WindowCategory; seconds: number }>;
  insight: string;
  switchLog: SwitchEntry[];
}

export class SessionMachine extends EventEmitter {
  private session: SessionData | null = null;
  private _state: SessionState = "IDLE";
  private driftThreshold = 4;
  private inactivityThreshold = 300;
  private lastActiveWin: { app: string; bundleId: string; timestamp: number } | null = null;
  private inactivityTimer: ReturnType<typeof setInterval> | null = null;
  private lastActivityTime = Date.now();

  get state(): SessionState {
    return this._state;
  }

  get current(): SessionData | null {
    return this.session;
  }

  setThresholds(driftThreshold: number, inactivityThreshold: number): void {
    this.driftThreshold = driftThreshold;
    this.inactivityThreshold = inactivityThreshold;
  }

  start(task: string, durationMin: number): SessionData {
    if (this.session) {
      if (this.session.pollTimer) clearInterval(this.session.pollTimer);
      if (this.session.endTimer) clearTimeout(this.session.endTimer);
    }

    this.session = {
      id: randomUUID(),
      task,
      durationMin,
      startTime: Date.now(),
      switchLog: [],
      nudgeLog: [],
      chatHistory: [],
      lastApp: "",
      lastCategory: "unknown",
      focusSec: 0,
      driftSec: 0,
      switchCount: 0,
      pollTimer: null,
      endTimer: setTimeout(() => this.end(), durationMin * 60 * 1000),
    };

    this._state = "ACTIVE";
    this.lastActivityTime = Date.now();
    this.emit("state-change", this._state);
    this.emit("update", this.buildUpdate());
    return this.session;
  }

  pause(): void {
    if (this._state !== "ACTIVE") return;
    this._state = "IDLE";
    if (this.session?.pollTimer) {
      clearInterval(this.session.pollTimer);
      this.session.pollTimer = null;
    }
    this.emit("state-change", this._state);
  }

  resume(): void {
    if (this._state !== "IDLE" || !this.session) return;
    this._state = "ACTIVE";
    this.startPolling();
    this.emit("state-change", this._state);
  }

  end(): SessionRecapPayload | null {
    if (!this.session) return null;

    if (this.session.pollTimer) clearInterval(this.session.pollTimer);
    if (this.session.endTimer) clearTimeout(this.session.endTimer);
    if (this.inactivityTimer) clearInterval(this.inactivityTimer);

    const recap = this.buildRecap();
    this._state = "RECAP";
    this.session = null;
    this.emit("state-change", this._state);
    this.emit("recap", recap);
    return recap;
  }

  onActiveWindow(app: string, bundleId: string, title: string): void {
    this.lastActiveWin = { app, bundleId, timestamp: Date.now() };
    this.lastActivityTime = Date.now();

    if (!this.session || this._state !== "ACTIVE") return;

    const category = categorize(app, bundleId);
    const now = Date.now();

    if (app !== this.session.lastApp) {
      this.session.switchLog.push({ app, category, timestamp: now });
      this.session.switchCount += 1;
      this.session.lastApp = app;
      this.session.lastCategory = category;
    }

    if (category === "focus" || category === "research") {
      this.session.focusSec += 2;
    } else if (category === "distraction") {
      this.session.driftSec += 2;
    }

    if (this.session.driftSec > 0 && this.session.switchCount >= this.driftThreshold) {
      if (this._state !== "DRIFTING") {
        this._state = "DRIFTING";
        this.emit("state-change", this._state);
      }
    } else if (this._state === "DRIFTING") {
      this._state = "ACTIVE";
      this.emit("state-change", this._state);
    }

    this.emit("update", this.buildUpdate());
  }

  onUserActivity(): void {
    this.lastActivityTime = Date.now();
    if (this._state === "INACTIVE") {
      this._state = "ACTIVE";
      this.emit("state-change", this._state);
    }
  }

  sendNudge(message: string, driftType: "frequency" | "distraction" | "stuck"): void {
    if (!this.session) return;
    const entry: NudgeEntry = { message, driftType, timestamp: Date.now() };
    this.session.nudgeLog.push(entry);
    this.emit("nudge", { message, driftType, urgent: false });
  }

  private startPolling(): void {
    if (!this.session) return;
    this.session.pollTimer = setInterval(() => this.tick(), 2000);
    this.inactivityTimer = setInterval(() => this.checkInactivity(), 1000);
  }

  private tick(): void {
    if (!this.session || this._state !== "ACTIVE") return;

    if (this.session.lastApp) {
      const category = this.session.lastCategory;
      if (category === "focus" || category === "research") {
        this.session.focusSec += 2;
      } else if (category === "distraction") {
        this.session.driftSec += 2;
      }
    }

    this.emit("update", this.buildUpdate());
  }

  private checkInactivity(): void {
    const inactiveSec = (Date.now() - this.lastActivityTime) / 1000;
    if (inactiveSec >= this.inactivityThreshold && this._state === "ACTIVE") {
      this._state = "INACTIVE";
      this.emit("state-change", this._state);
      this.emit("nudge", {
        message: "Still there? Take a breath and dive back in.",
        driftType: "frequency" as DriftType,
        urgent: false,
      });
    } else if (inactiveSec < this.inactivityThreshold && this._state === "INACTIVE") {
      this._state = "ACTIVE";
      this.emit("state-change", this._state);
    }
  }

  private buildUpdate(): SessionUpdate {
    const elapsedSec = this.session
      ? Math.floor((Date.now() - this.session.startTime) / 1000)
      : 0;

    return {
      currentApp: this.session?.lastApp ?? "",
      currentAppBundle: "",
      category: this.session?.lastCategory ?? "unknown",
      switchCount: this.session?.switchCount ?? 0,
      elapsedSec,
      focusSec: this.session?.focusSec ?? 0,
      driftSec: this.session?.driftSec ?? 0,
      ghostState: deriveGhostState(
        this.session?.lastCategory ?? "unknown",
        this.session?.driftSec ?? 0
      ),
      recentSwitches: this.session?.switchLog.slice(-5).reverse() ?? [],
    };
  }

  private buildRecap(): SessionRecapPayload {
    if (!this.session) throw new Error("no active session");

    const appTime = new Map<string, { seconds: number; category: WindowCategory }>();
    const entries = this.session.switchLog;

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

    const totalSec = Math.max(1, this.session.focusSec + this.session.driftSec);
    const focusPct = Math.round((this.session.focusSec / totalSec) * 100);

    let insight: string;
    if (focusPct >= 80) {
      insight = `Strong session — you stayed focused ${focusPct}% of the time on "${this.session.task}". Keep that streak going.`;
    } else if (focusPct >= 60) {
      insight = `Decent focus at ${focusPct}% on "${this.session.task}". A few drifts but you pulled back.`;
    } else {
      insight = `Tough one — only ${focusPct}% focus time. Identify what pulled you away from "${this.session.task}".`;
    }

    return {
      task: this.session.task,
      durationMin: this.session.durationMin,
      focusSec: this.session.focusSec,
      driftSec: this.session.driftSec,
      totalSwitches: this.session.switchCount,
      nudgesReceived: this.session.nudgeLog.length,
      nudgesDismissedAsBreak: 0,
      appBreakdown,
      insight,
      switchLog: this.session.switchLog,
    };
  }
}

type DriftType = "frequency" | "distraction" | "stuck";

export const sessionMachine = new SessionMachine();