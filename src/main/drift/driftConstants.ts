// ── Nudge timing rules ────────────────────────────────────────────────────────
// These values control how often nudges can appear and how quickly FocusGhost
// detects different drift patterns.

// Cooldowns prevent the same nudge type from firing repeatedly too fast.
// Values are in milliseconds, so 10 * 1000 = 10 seconds.
export const NUDGE_COOLDOWNS: Record<string, number> = {
  // Small in-app reminder shown inside the main FocusGhost window.
  "in-app": 10 * 1000,

  // Firm popup when the user stays on a distraction too long.
  "distraction-firm": 15 * 1000,

  // Stronger popup for hard distractions like games/social/video apps.
  "distraction-hard": 15 * 1000,

  // Popup when the user keeps switching apps like they are stuck.
  "stuck-helpful": 20 * 1000,

  // Popup when the user has been idle/away.
  "idle-soft": 20 * 1000,

  // Popup when the user keeps returning to the same distraction.
  "pattern-observational": 20 * 1000,

  // Positive milestone should only fire once per session.
  "milestone-positive": Infinity,

  // Clarification nudge asks whether an unclear activity should count as focus.
  // pendingClarifications prevents asking about the same app/tab repeatedly;
  // this cooldown is an extra safety backup.
  clarify: 30 * 1000,
};

// ── Drift detection thresholds ────────────────────────────────────────────────
// These are demo/testing values, so nudges trigger quickly.
// For production, increase them so the app feels less annoying.
// Time spent continuously on a distraction before a firm nudge appears.
// Demo: 8 seconds
export const DISTRACTION_FIRM_SEC = 8;

// Number of repeat visits needed before showing the pattern nudge.
// Demo: 1 means it can fire very quickly. Production idea: 2.
export const PATTERN_VISIT_COUNT = 1;

// Time window for counting repeat distraction visits.
// Demo: last 90 seconds.
export const PATTERN_WINDOW_SEC = 90;

// Number of quick app/tab switches needed before checking for “stuck” behavior.
export const STUCK_SWITCH_COUNT = 3;

// Time window for counting those recent switches.
export const STUCK_WINDOW_SEC = 45;

// The latest switch must be this recent to count as actively stuck.
export const STUCK_RECENCY_SEC = 15;

// Idle time before FocusGhost asks if the user is still there.
export const IDLE_TRIGGER_SEC = 10;

// Continuous focus time needed before showing a positive milestone.
// Demo: 20 seconds. Production idea: 25 minutes.
export const MILESTONE_STREAK_SEC = 20;
