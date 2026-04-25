// FocusGhost reactive store, written in Svelte 5 runes.
//
// Why a single store?
//   • It's the single subscription point for all main-process events.
//   • Components read .session, .tick, etc. directly; reactivity is
//     automatic because the fields are $state.
//   • It exposes a derived `screen` so App.svelte can route without
//     scattering screen-deciding logic across components.
//
// The store assumes window.fg / window.fgEvents are present (provided by the
// preload bridge). If they aren't (e.g. running in a plain browser preview),
// we fall back to inert no-op state so the UI still renders.

import type {
  ActiveWindowInfo,
  AppSettings,
  DriftSnapshot,
  GhostMessage,
  NudgePayload,
  SessionData,
} from "@shared/types"

export type Screen =
  | "task-declaration"
  | "active"
  | "chat"
  | "recap"
  | "collapsed-bar"

const hasIPC = typeof window !== "undefined" && !!window.fg

class FocusGhostStore {
  // ─── Reactive state ──────────────────────────────────────────────────────
  session = $state<SessionData | null>(null)
  /** Last completed session — shown on Recap. */
  lastFinishedSession = $state<SessionData | null>(null)
  elapsedMs = $state<number>(0)
  drift = $state<DriftSnapshot>({
    score: 0,
    driftMs: 0,
    taskMs: 0,
    contextMs: 0,
    totalActiveMs: 0,
  })
  activeWindow = $state<ActiveWindowInfo | null>(null)
  settings = $state<AppSettings | null>(null)
  chatMessages = $state<GhostMessage[]>([])
  /** Most recent nudge; cleared on dismiss. */
  currentNudge = $state<NudgePayload | null>(null)
  /** Renderer-side flag for whether the user has opened the chat panel. */
  showChat = $state<boolean>(false)
  /** Mirrors window collapse state (driven by setCollapsed). */
  collapsed = $state<boolean>(false)
  /** True after we've finished the initial bootstrap from main. */
  ready = $state<boolean>(false)

  // ─── Derived ─────────────────────────────────────────────────────────────
  screen: Screen = $derived.by(() => {
    if (this.collapsed) return "collapsed-bar"
    if (this.showChat && this.session) return "chat"
    if (this.session) return "active"
    if (this.lastFinishedSession) return "recap"
    return "task-declaration"
  })

  taskMinutesElapsed = $derived(Math.floor(this.elapsedMs / 60000))

  driftLevel: "calm" | "wobbly" | "drifting" = $derived.by(() => {
    const s = this.drift.score
    if (s < 30) return "calm"
    if (s < 65) return "wobbly"
    return "drifting"
  })

  // ─── Bootstrap ───────────────────────────────────────────────────────────
  async init(): Promise<void> {
    if (!hasIPC) {
      this.ready = true
      return
    }
    const [session, settings, history] = await Promise.all([
      window.fg.getCurrentSession(),
      window.fg.getSettings(),
      window.fg.getChatHistory(),
    ])
    this.session = session
    this.settings = settings
    this.chatMessages = history

    // Subscribe to every push channel the preload exposes.
    window.fgEvents.on("session:update", (s) => {
      // When a session ends, main emits update(null). Stash it as
      // lastFinishedSession so Recap has something to render.
      if (s === null && this.session) {
        this.lastFinishedSession = { ...this.session, state: "completed" }
      } else if (s && s.state === "completed") {
        this.lastFinishedSession = s
      }
      this.session = s
      if (s) {
        this.elapsedMs = Math.max(
          0,
          Date.now() - s.startedAt - s.pausedMs - s.inactiveMs
        )
        this.drift = s.drift
      } else {
        this.elapsedMs = 0
      }
    })
    window.fgEvents.on("session:tick", ({ elapsedMs, drift }) => {
      this.elapsedMs = elapsedMs
      this.drift = drift
    })
    window.fgEvents.on("active-window", (w) => {
      this.activeWindow = w
    })
    window.fgEvents.on("nudge", (n) => {
      this.currentNudge = n
    })
    window.fgEvents.on("settings:update", (s) => {
      this.settings = s
    })
    window.fgEvents.on("ghost:message", (m) => {
      // The main process emits both the user echo and the ghost reply;
      // dedupe by id in case sendChatMessage also returns it.
      if (!this.chatMessages.find((x) => x.id === m.id)) {
        this.chatMessages = [...this.chatMessages, m]
      }
    })

    this.ready = true
  }

  // ─── Actions ─────────────────────────────────────────────────────────────
  async startSession(taskDescription: string, plannedMinutes: number | null) {
    if (!hasIPC) return
    this.lastFinishedSession = null
    await window.fg.startSession({
      taskDescription,
      plannedDurationMinutes: plannedMinutes,
    })
  }

  async pauseSession() {
    if (hasIPC) await window.fg.pauseSession()
  }
  async resumeSession() {
    if (hasIPC) await window.fg.resumeSession()
  }
  async endSession(reflection?: string | null) {
    if (hasIPC) await window.fg.endSession(reflection ?? null)
  }
  async dismissRecap() {
    this.lastFinishedSession = null
  }

  async setOpacity(opacity: number) {
    if (hasIPC) await window.fg.setOpacity(opacity)
  }
  async setCollapsed(c: boolean) {
    this.collapsed = c
    if (hasIPC) await window.fg.collapseWindow(c)
  }
  toggleChat() {
    this.showChat = !this.showChat
  }

  async sendChat(message: string) {
    if (!hasIPC) return
    await window.fg.sendChatMessage(message)
  }
  async clearChat() {
    if (!hasIPC) return
    await window.fg.clearChatHistory()
    this.chatMessages = []
  }

  dismissNudge() {
    this.currentNudge = null
  }
}

export const fg = new FocusGhostStore()
