import type {
  SwitchEntry,
  NudgeEntry,
  ChatEntry,
  WindowCategory,
} from "../../shared/ipc-contract";

export interface SessionState {
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
  stuckRollingLog: SwitchEntry[]; // cleared after stuck fires; separate from switchLog
  idleSoftFired: boolean; // true after idle-soft fires; reset when user is active
  focusStreakStart: number | null; // timestamp when current focus streak began
  blockedApps: Map<string, number>; // appName → blockedUntil timestamp
  sessionCorrections: import("../../shared/classificationTypes").SessionCorrection[]; // user overrides for this session only
  pendingClarifications: Set<string>; // keys already asked about ("appName:tabTitle")
}
