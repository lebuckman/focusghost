import type { AppSettings } from "./types"

/** How often the active window is sampled, ms. */
export const POLL_INTERVAL_MS = 1500

/** How often the renderer gets a session tick, ms. */
export const TICK_INTERVAL_MS = 1000

/** Drift score threshold above which we send a "drift" nudge. */
export const DRIFT_NUDGE_SCORE = 60

/** Minimum ms between successive nudges of the same kind. */
export const NUDGE_COOLDOWN_MS = 90_000

export const DEFAULT_SETTINGS: AppSettings = {
  windowOpacity: 0.92,
  inactivityThresholdSec: 30,
  stuckDriftThreshold: 70,
  stuckIdleMinutes: 5,
  enableGhostAI: true,
  theme: "ghost",
  categoryRules: [],
  sprintPresets: [25, 50, 90],
  demoMode: false,
}

/** Hard-coded categorization fallbacks; overridden by user rules and AI. */
export const BUILTIN_APP_CATEGORIES: Record<string, "task" | "context" | "drift" | "neutral"> = {
  // Common drift apps (entertainment / social)
  youtube: "drift",
  twitter: "drift",
  x: "drift",
  reddit: "drift",
  tiktok: "drift",
  instagram: "drift",
  facebook: "drift",
  netflix: "drift",
  twitch: "drift",
  discord: "drift",
  // Common context apps (communication / docs)
  slack: "context",
  notion: "context",
  linear: "context",
  jira: "context",
  gmail: "context",
  outlook: "context",
  mail: "context",
  // Common task apps (development / creative)
  code: "task",
  "visual studio code": "task",
  cursor: "task",
  xcode: "task",
  "android studio": "task",
  intellij: "task",
  webstorm: "task",
  pycharm: "task",
  figma: "task",
  sketch: "task",
  photoshop: "task",
  illustrator: "task",
  blender: "task",
  terminal: "task",
  iterm: "task",
  warp: "task",
}
