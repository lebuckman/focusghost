import type {
  AppSettings,
  ChatResponsePayload,
  GhostMessagePayload,
  NudgePayload,
  SessionRecapPayload,
  SessionUpdate,
  SwitchEntry,
  WindowCategory,
  GhostMascotState,
  NudgeType,
  GhostMessageTrigger,
} from "./ipc-contract";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isString = (value: unknown): value is string => typeof value === "string";

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString);

const isOneOf = <T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T => isString(value) && allowed.includes(value as T);

const WINDOW_CATEGORIES = [
  "focus",
  "research",
  "distraction",
  "inactive",
  "unknown",
] as const satisfies readonly WindowCategory[];

const GHOST_STATES = [
  "calm",
  "concerned",
  "thinking",
  "happy",
  "sleepy",
] as const satisfies readonly GhostMascotState[];

const NUDGE_TYPES = [
  "distraction-firm",
  "distraction-hard",
  "stuck-helpful",
  "idle-soft",
  "pattern-observational",
  "milestone-positive",
  "in-app",
  "clarify",
] as const satisfies readonly NudgeType[];

const GHOST_MESSAGE_TRIGGERS = [
  "stuck_drift",
  "distraction_drift",
  "frequency_drift",
  "proactive",
  "user_reply",
] as const satisfies readonly GhostMessageTrigger[];

const isSwitchEntry = (value: unknown): value is SwitchEntry =>
  isObject(value) &&
  isString(value.app) &&
  isOneOf(value.category, WINDOW_CATEGORIES) &&
  isNumber(value.timestamp) &&
  (value.title === undefined || isString(value.title)) &&
  (value.icon === undefined || isString(value.icon));

const isChatResponsePayload = (value: unknown): value is ChatResponsePayload =>
  isObject(value) && isString(value.message) && isNumber(value.timestamp);

const isGhostMessagePayload = (value: unknown): value is GhostMessagePayload =>
  isObject(value) &&
  isString(value.message) &&
  isOneOf(value.trigger, GHOST_MESSAGE_TRIGGERS) &&
  isNumber(value.timestamp);

const isSessionUpdate = (value: unknown): value is SessionUpdate =>
  isObject(value) &&
  isString(value.currentApp) &&
  isString(value.currentAppProcess) &&
  isString(value.currentAppBundle) &&
  isString(value.currentAppTitle) &&
  isOneOf(value.category, WINDOW_CATEGORIES) &&
  isNumber(value.switchCount) &&
  isNumber(value.elapsedSec) &&
  isNumber(value.focusSec) &&
  isNumber(value.driftSec) &&
  isOneOf(value.ghostState, GHOST_STATES) &&
  Array.isArray(value.recentSwitches) &&
  value.recentSwitches.every(isSwitchEntry);

const isNudgePayload = (value: unknown): value is NudgePayload =>
  isObject(value) &&
  isOneOf(value.type, NUDGE_TYPES) &&
  (value.tier === 1 || value.tier === 2) &&
  isString(value.message) &&
  isOneOf(value.driftType, ["frequency", "distraction", "stuck"] as const) &&
  (value.context === undefined ||
    (isObject(value.context) &&
      (value.context.task === undefined || isString(value.context.task)) &&
      (value.context.appName === undefined ||
        isString(value.context.appName)) &&
      (value.context.driftDurationSec === undefined ||
        isNumber(value.context.driftDurationSec)) &&
      (value.context.investedSec === undefined ||
        isNumber(value.context.investedSec)) &&
      (value.context.remainingSec === undefined ||
        isNumber(value.context.remainingSec)) &&
      (value.context.occurrences === undefined ||
        isNumber(value.context.occurrences)) &&
      (value.context.streakDays === undefined ||
        isNumber(value.context.streakDays)) &&
      (value.context.blockUntil === undefined ||
        isNumber(value.context.blockUntil)) &&
      (value.context.clarificationPayload === undefined ||
        (isObject(value.context.clarificationPayload) &&
          isBoolean(value.context.clarificationPayload.isBrowser) &&
          (value.context.clarificationPayload.appName === undefined ||
            isString(value.context.clarificationPayload.appName)) &&
          (value.context.clarificationPayload.siteName === undefined ||
            isString(value.context.clarificationPayload.siteName)) &&
          isStringArray(value.context.clarificationPayload.titleKeywords)))));

const isAppSettings = (value: unknown): value is AppSettings =>
  isObject(value) &&
  isNumber(value.driftThreshold) &&
  isNumber(value.inactivityThreshold) &&
  isBoolean(value.nudgeEnabled) &&
  isBoolean(value.voiceEnabled) &&
  isOneOf(value.personality, [
    "supportive",
    "playful",
    "drill-sergeant",
  ] as const) &&
  isNumber(value.opacity) &&
  isOneOf(value.accentColor, ["teal", "violet", "amber"] as const) &&
  isOneOf(value.nudgeSensitivity, ["gentle", "balanced", "strict"] as const) &&
  isBoolean(value.alwaysOnTop) &&
  isBoolean(value.autoCollapse) &&
  isBoolean(value.autoDim);

const isSessionRecapPayload = (value: unknown): value is SessionRecapPayload =>
  isObject(value) &&
  isString(value.task) &&
  isNumber(value.durationMin) &&
  isNumber(value.focusSec) &&
  isNumber(value.driftSec) &&
  isNumber(value.totalSwitches) &&
  isNumber(value.nudgesReceived) &&
  isNumber(value.nudgesDismissedAsBreak) &&
  Array.isArray(value.appBreakdown) &&
  value.appBreakdown.every(
    (entry) =>
      isObject(entry) &&
      isString(entry.app) &&
      isOneOf(entry.category, WINDOW_CATEGORIES) &&
      isNumber(entry.seconds),
  ) &&
  isString(value.insight) &&
  Array.isArray(value.switchLog) &&
  value.switchLog.every(isSwitchEntry);

export {
  isAppSettings,
  isChatResponsePayload,
  isGhostMessagePayload,
  isNudgePayload,
  isSessionRecapPayload,
  isSessionUpdate,
};
