// Shared types between main and renderer processes.
// Keep this file dependency-free so it can be imported anywhere.

export type SessionState =
  | "idle"
  | "active"
  | "paused"
  | "stuck"
  | "completed"

export type AppCategory =
  | "task"
  | "context"
  | "drift"
  | "neutral"
  | "unknown"

export interface ActiveWindowInfo {
  /** App / executable name reported by active-win, e.g. "Code", "Figma". */
  app: string
  /** Window title, e.g. "Untitled-1 - VS Code". */
  title: string
  /** Bundle id / executable path; useful for stable categorization. */
  bundleId?: string | null
  /** URL when the active window is a browser, if available. */
  url?: string | null
  /** Timestamp when this sample was taken (ms). */
  timestamp: number
}

/**
 * A continuous interval the user spent on a single (app, title) pair during
 * a session. Multiple intervals for the same app are aggregated into
 * `AppUsage` for display.
 */
export interface AppInterval {
  app: string
  title: string
  category: AppCategory
  /** ms */
  start: number
  /** ms */
  end: number
  /** end - start, ms */
  duration: number
}

export interface AppUsage {
  app: string
  category: AppCategory
  /** Total ms spent in this app this session. */
  totalMs: number
  /** Count of distinct intervals (i.e. how many times the user switched in). */
  switchCount: number
}

export interface DriftSnapshot {
  /** 0-100 score where higher = more drift away from declared task. */
  score: number
  /** Total ms spent on `drift`-categorized apps this session. */
  driftMs: number
  /** Total ms spent on `task`-categorized apps this session. */
  taskMs: number
  /** Total ms spent on `context`-categorized apps this session. */
  contextMs: number
  /** Total ms tracked in this session (excluding inactivity). */
  totalActiveMs: number
}

export interface SessionData {
  id: string
  /** What the user said they're working on. */
  taskDescription: string
  /** Optional sprint preset duration in minutes (e.g. 25, 50). */
  plannedDurationMinutes: number | null
  state: SessionState
  startedAt: number
  endedAt: number | null
  /** Cumulative paused time, ms. */
  pausedMs: number
  /** Cumulative inactive time, ms. */
  inactiveMs: number
  intervals: AppInterval[]
  drift: DriftSnapshot
  /** Optional user reflection captured during recap. */
  reflection?: string | null
  /** AI-generated 1-2 sentence recap insight. Populated async after end. */
  aiRecap?: string | null
}

export interface CategoryRule {
  /** Match against app name (case-insensitive substring). */
  appPattern?: string
  /** Match against window title (case-insensitive substring). */
  titlePattern?: string
  /** Match against URL (case-insensitive substring). */
  urlPattern?: string
  category: AppCategory
}

export interface CategorizationContext {
  /** What the user said they're working on, used by AI categorization. */
  taskDescription: string
  /** Apps the user has flagged for this task (taskApps). */
  taskApps: string[]
  /** Apps explicitly marked as drift. */
  driftApps: string[]
  /** Apps explicitly marked as context. */
  contextApps: string[]
  /** Custom rules from settings. */
  rules: CategoryRule[]
}

export interface AppSettings {
  /** Renderer window opacity 0.05..1. */
  windowOpacity: number
  /** Inactivity threshold in seconds; default 30. */
  inactivityThresholdSec: number
  /** Stuck mode threshold: drift score above which to enter stuck mode. */
  stuckDriftThreshold: number
  /** Stuck mode threshold: minutes without task-app activity. */
  stuckIdleMinutes: number
  /** Whether to enable Ghost AI chat features (requires AI_GATEWAY_API_KEY). */
  enableGhostAI: boolean
  /** UI theme. */
  theme: "ghost" | "midnight" | "paper"
  /** User-defined category rules. */
  categoryRules: CategoryRule[]
  /** Sprint presets, minutes. */
  sprintPresets: number[]
  /** Run in demo mode (no real OS tracking, scripted activity). */
  demoMode: boolean
}

export interface PersistedState {
  settings: AppSettings
  sessions: SessionData[]
}

export interface GhostMessage {
  id: string
  role: "user" | "ghost" | "system"
  content: string
  timestamp: number
}

export interface NudgePayload {
  kind: "drift" | "stuck" | "encouragement" | "pattern" | "recap-insight"
  message: string
  timestamp: number
}

/**
 * The complete set of methods the renderer can call on the main process.
 * Implemented in main/ipc.ts; exposed to the renderer via preload as
 * `window.fg`.
 */
export interface FocusGhostAPI {
  // Session control
  startSession(input: {
    taskDescription: string
    plannedDurationMinutes: number | null
  }): Promise<SessionData>
  pauseSession(): Promise<SessionData | null>
  resumeSession(): Promise<SessionData | null>
  endSession(reflection?: string | null): Promise<SessionData | null>
  getCurrentSession(): Promise<SessionData | null>
  getSessions(): Promise<SessionData[]>

  // Window state
  setOpacity(opacity: number): Promise<number>
  setAlwaysOnTop(enabled: boolean): Promise<boolean>
  collapseWindow(collapsed: boolean): Promise<boolean>

  // Settings
  getSettings(): Promise<AppSettings>
  updateSettings(patch: Partial<AppSettings>): Promise<AppSettings>

  // Categorization helpers
  categorizeApp(app: string, title: string): Promise<AppCategory>
  setAppCategoryOverride(app: string, category: AppCategory): Promise<void>

  // Ghost AI chat
  sendChatMessage(message: string): Promise<GhostMessage>
  getChatHistory(): Promise<GhostMessage[]>
  clearChatHistory(): Promise<void>

  // Demo mode controls
  triggerDemoEvent(
    event: "drift" | "stuck" | "encouragement" | "task-switch"
  ): Promise<void>
}

/**
 * Event names the main process pushes to the renderer. Listen with
 * `window.fg.on(channel, handler)`.
 */
export type RendererEvent =
  | { channel: "session:update"; payload: SessionData | null }
  | { channel: "session:tick"; payload: { elapsedMs: number; drift: DriftSnapshot } }
  | { channel: "active-window"; payload: ActiveWindowInfo | null }
  | { channel: "nudge"; payload: NudgePayload }
  | { channel: "settings:update"; payload: AppSettings }
  | { channel: "ghost:message"; payload: GhostMessage }

export type RendererEventChannel = RendererEvent["channel"]
export type RendererEventPayload<C extends RendererEventChannel> = Extract<
  RendererEvent,
  { channel: C }
>["payload"]
