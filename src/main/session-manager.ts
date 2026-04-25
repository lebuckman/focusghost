import { EventEmitter } from "node:events"
import { randomUUID } from "node:crypto"
import type {
  ActiveWindowInfo,
  AppInterval,
  AppCategory,
  CategorizationContext,
  DriftSnapshot,
  NudgePayload,
  SessionData,
  SessionState,
} from "@shared/types"
import {
  DRIFT_NUDGE_SCORE,
  NUDGE_COOLDOWN_MS,
  TICK_INTERVAL_MS,
} from "@shared/constants"
import { computeDrift } from "./drift-scorer"
import { categorize, buildCategorizationContext } from "./categorization"
import { saveSession } from "./store"

interface StartInput {
  taskDescription: string
  plannedDurationMinutes: number | null
}

/**
 * SessionManager owns the lifecycle of a focus session and aggregates raw
 * window-switch events into intervals, app totals, and drift snapshots.
 *
 * State machine:
 *
 *           startSession()
 *   idle ─────────────────► active ◄────► paused
 *                             │  ▲          │
 *                  drift hi   │  │ resume   │ pauseSession()
 *                             ▼  │          │
 *                            stuck          │
 *                             │             │
 *                  endSession ▼             ▼
 *                          completed
 *
 * Events emitted:
 *   - "update"   (SessionData)        on every state change
 *   - "tick"     ({ elapsedMs, drift }) every TICK_INTERVAL_MS while active
 *   - "nudge"    (NudgePayload)       when drift / stuck thresholds trip
 */
export class SessionManager extends EventEmitter {
  private session: SessionData | null = null
  private currentInterval: AppInterval | null = null
  private currentWindow: ActiveWindowInfo | null = null
  private isInactive = false
  private inactiveStartedAt = 0
  private pausedStartedAt = 0
  private tickTimer: NodeJS.Timeout | null = null
  private lastNudgeAt: Record<string, number> = {}
  private categorizationCtx: CategorizationContext = buildCategorizationContext("")

  /** taskApps / driftApps / contextApps populated by the AI in Sprint 3. */
  private taskApps: string[] = []
  private driftApps: string[] = []
  private contextApps: string[] = []

  // ─── Public API ──────────────────────────────────────────────────────────

  start(input: StartInput): SessionData {
    this.endIfActive("completed")
    const now = Date.now()
    this.session = {
      id: randomUUID(),
      taskDescription: input.taskDescription.trim(),
      plannedDurationMinutes: input.plannedDurationMinutes,
      state: "active",
      startedAt: now,
      endedAt: null,
      pausedMs: 0,
      inactiveMs: 0,
      intervals: [],
      drift: { score: 0, driftMs: 0, taskMs: 0, contextMs: 0, totalActiveMs: 0 },
      reflection: null,
    }
    this.categorizationCtx = buildCategorizationContext(
      this.session.taskDescription,
      this.taskApps,
      this.driftApps,
      this.contextApps
    )
    this.startTickTimer()
    // If we already had an active window before the session started, open
    // the first interval now.
    if (this.currentWindow) this.openInterval(this.currentWindow, now)
    this.emitUpdate()
    return this.session
  }

  pause(): SessionData | null {
    if (!this.session || this.session.state !== "active") return this.session
    this.closeInterval(Date.now())
    this.session.state = "paused"
    this.pausedStartedAt = Date.now()
    this.stopTickTimer()
    this.emitUpdate()
    return this.session
  }

  resume(): SessionData | null {
    if (!this.session || this.session.state !== "paused") return this.session
    const now = Date.now()
    if (this.pausedStartedAt > 0) {
      this.session.pausedMs += now - this.pausedStartedAt
      this.pausedStartedAt = 0
    }
    this.session.state = "active"
    if (this.currentWindow && !this.isInactive) {
      this.openInterval(this.currentWindow, now)
    }
    this.startTickTimer()
    this.emitUpdate()
    return this.session
  }

  end(reflection?: string | null): SessionData | null {
    return this.endIfActive("completed", reflection)
  }

  current(): SessionData | null {
    return this.session
  }

  // ─── Hints from window/inactivity trackers ───────────────────────────────

  onActiveWindow(win: ActiveWindowInfo): void {
    this.currentWindow = win
    if (!this.session || this.session.state !== "active" || this.isInactive) return
    const now = win.timestamp
    // Close out the prior interval, open a new one for this app/title.
    this.closeInterval(now)
    this.openInterval(win, now)
    this.emitUpdate()
  }

  onIdle(): void {
    this.isInactive = true
    this.inactiveStartedAt = Date.now()
    if (this.session && this.session.state === "active") {
      this.closeInterval(this.inactiveStartedAt)
      this.emitUpdate()
    }
  }

  onActive(): void {
    if (!this.isInactive) return
    const now = Date.now()
    if (this.session) {
      this.session.inactiveMs += now - this.inactiveStartedAt
    }
    this.isInactive = false
    if (this.session?.state === "active" && this.currentWindow) {
      this.openInterval(this.currentWindow, now)
    }
    this.emitUpdate()
  }

  // ─── Categorization hints (used by Ghost AI in Sprint 3) ─────────────────

  setCategorizationHints(input: {
    taskApps?: string[]
    driftApps?: string[]
    contextApps?: string[]
  }): void {
    if (input.taskApps) this.taskApps = input.taskApps
    if (input.driftApps) this.driftApps = input.driftApps
    if (input.contextApps) this.contextApps = input.contextApps
    if (this.session) {
      this.categorizationCtx = buildCategorizationContext(
        this.session.taskDescription,
        this.taskApps,
        this.driftApps,
        this.contextApps
      )
    }
  }

  /** Called by SessionManager consumers (e.g. stuck-mode logic in Sprint 3). */
  forceState(state: SessionState): void {
    if (!this.session) return
    if (this.session.state === state) return
    this.session.state = state
    this.emitUpdate()
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  private endIfActive(
    targetState: "completed",
    reflection?: string | null
  ): SessionData | null {
    if (!this.session) return null
    const now = Date.now()
    if (this.session.state === "paused" && this.pausedStartedAt > 0) {
      this.session.pausedMs += now - this.pausedStartedAt
      this.pausedStartedAt = 0
    }
    if (this.isInactive) {
      this.session.inactiveMs += now - this.inactiveStartedAt
      this.isInactive = false
    }
    this.closeInterval(now)
    this.session.state = targetState
    this.session.endedAt = now
    this.session.drift = computeDrift(this.session.intervals, now)
    if (reflection !== undefined) this.session.reflection = reflection ?? null
    this.stopTickTimer()
    saveSession(this.session)
    this.emitUpdate()
    const finished = this.session
    this.session = null
    this.currentInterval = null
    this.lastNudgeAt = {}
    this.taskApps = []
    this.driftApps = []
    this.contextApps = []
    return finished
  }

  private openInterval(win: ActiveWindowInfo, at: number): void {
    if (!this.session) return
    const category: AppCategory = categorize(
      win.app,
      win.title,
      win.url,
      this.categorizationCtx
    )
    this.currentInterval = {
      app: win.app,
      title: win.title,
      category,
      start: at,
      end: at,
      duration: 0,
    }
  }

  private closeInterval(at: number): void {
    if (!this.session || !this.currentInterval) return
    this.currentInterval.end = Math.max(at, this.currentInterval.start)
    this.currentInterval.duration =
      this.currentInterval.end - this.currentInterval.start
    if (this.currentInterval.duration > 0) {
      this.session.intervals.push(this.currentInterval)
    }
    this.currentInterval = null
  }

  private startTickTimer(): void {
    this.stopTickTimer()
    this.tickTimer = setInterval(() => this.tick(), TICK_INTERVAL_MS)
  }

  private stopTickTimer(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
  }

  private tick(): void {
    if (!this.session || this.session.state !== "active") return
    const now = Date.now()
    // Extend the open interval into "now" without finalizing it, so tickers
    // see live durations.
    if (this.currentInterval) {
      this.currentInterval.end = now
      this.currentInterval.duration = now - this.currentInterval.start
    }
    const liveIntervals = this.currentInterval
      ? [...this.session.intervals, this.currentInterval]
      : this.session.intervals
    const drift: DriftSnapshot = computeDrift(liveIntervals, now)
    this.session.drift = drift

    const elapsedMs =
      now - this.session.startedAt - this.session.pausedMs - this.session.inactiveMs
    this.emit("tick", { elapsedMs: Math.max(0, elapsedMs), drift })

    // Drift nudge.
    if (drift.score >= DRIFT_NUDGE_SCORE) {
      this.maybeNudge({
        kind: "drift",
        timestamp: now,
        message: `You've drifted from "${this.session.taskDescription}". Want to come back?`,
      })
    }
  }

  private maybeNudge(n: NudgePayload): void {
    const last = this.lastNudgeAt[n.kind] ?? 0
    if (n.timestamp - last < NUDGE_COOLDOWN_MS) return
    this.lastNudgeAt[n.kind] = n.timestamp
    this.emit("nudge", n)
  }

  private emitUpdate(): void {
    this.emit("update", this.session)
  }
}
