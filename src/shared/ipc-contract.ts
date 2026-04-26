/**
 * FocusGhost — Shared IPC Contract
 * THIS FILE IS THE NORTH STAR. DO NOT CHANGE WITHOUT TEAM DISCUSSION.
 */

export const IPC = {
  START_SESSION:   'START_SESSION',
  END_SESSION:     'END_SESSION',
  CHAT_MESSAGE:    'CHAT_MESSAGE',
  DISMISS_NUDGE:   'DISMISS_NUDGE',
  NUDGE_ACTION:    'NUDGE_ACTION',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  SESSION_UPDATE:  'SESSION_UPDATE',
  TRIGGER_NUDGE:   'TRIGGER_NUDGE',
  OPEN_GHOST_CHAT: 'OPEN_GHOST_CHAT',
  GHOST_MESSAGE:   'GHOST_MESSAGE',
  CHAT_RESPONSE:   'CHAT_RESPONSE',
  SESSION_RECAP:   'SESSION_RECAP',
  DEBUG_NUDGE:     'DEBUG_NUDGE',
  NUDGE_DISMISSED: 'NUDGE_DISMISSED',
} as const;

export type IPCChannel = (typeof IPC)[keyof typeof IPC];

export type WindowCategory = 'focus' | 'research' | 'distraction' | 'inactive' | 'unknown';
export type DriftType = 'frequency' | 'distraction' | 'stuck';
export type NudgeType =
  | 'distraction-firm' | 'distraction-hard' | 'stuck-helpful'
  | 'idle-soft' | 'pattern-observational' | 'milestone-positive' | 'in-app';
export type GhostMascotState = 'calm' | 'concerned' | 'thinking' | 'happy' | 'sleepy';
export type GhostMessageTrigger = 'stuck_drift' | 'distraction_drift' | 'frequency_drift' | 'proactive' | 'user_reply';

export interface SwitchEntry { app: string; category: WindowCategory; timestamp: number; title?: string; }
export interface ChatEntry   { role: 'user' | 'ghost'; content: string; timestamp: number; }
export interface NudgeEntry  { message: string; driftType: DriftType; timestamp: number; }

export interface StartSessionPayload  { task: string; durationMin: number; }
export interface DismissNudgePayload  { action: 'acknowledged' | 'break'; }
export interface ChatMessagePayload   { message: string; chatHistory: ChatEntry[]; }

export interface SessionUpdate {
  currentApp: string;          // display name: extracted tab title for browsers, app name otherwise
  currentAppProcess: string;   // raw OS app name — used for categorization, never displayed
  currentAppBundle: string;
  currentAppTitle: string;
  category: WindowCategory;
  switchCount: number;
  elapsedSec: number;
  focusSec: number;
  driftSec: number;
  ghostState: GhostMascotState;
  recentSwitches: SwitchEntry[];
}

export interface NudgePayload {
  type: NudgeType;
  tier: 1 | 2;
  message: string;
  driftType: DriftType;
  context?: {
    task?: string;
    appName?: string;
    driftDurationSec?: number;
    investedSec?: number;
    remainingSec?: number;
    occurrences?: number;
    streakDays?: number;
    blockUntil?: number;
  };
}
export interface OpenGhostChatPayload { trigger: DriftType; }
export interface GhostMessagePayload  { message: string; trigger: GhostMessageTrigger; timestamp: number; }
export interface ChatResponsePayload  { message: string; timestamp: number; }

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

export interface DriftEvent {
  type: 'distraction' | 'stuck' | 'frequency' | 'inactivity';
  app?: string;
  timestamp: number;
  sessionTask: string;
  recoveryTime?: number;
  userResponded?: 'back_to_work' | 'im_stuck' | 'break' | 'dismissed';
}

export interface AppSettings {
  driftThreshold: number;
  inactivityThreshold: number;
  nudgeEnabled: boolean;
  voiceEnabled: boolean;
  opacity: number;
  accentColor: 'teal' | 'violet' | 'amber';
  nudgeSensitivity: 'gentle' | 'balanced' | 'strict';
  alwaysOnTop: boolean;
  autoCollapse: boolean;
}

export interface ActiveSession {
  task: string;
  durationMin: number;
  startTime: number;
  switchLog: SwitchEntry[];
  nudgeLog: NudgeEntry[];
  chatHistory: ChatEntry[];
}

export interface AppStore {
  currentSession: ActiveSession | null;
  sessionHistory: SessionRecapPayload[];
  settings: AppSettings;
  deviceId: string;
  userId: string | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  driftThreshold: 7,
  inactivityThreshold: 90, // demo: 1m30s — raise to 300 (5min) for production
  nudgeEnabled: true,
  voiceEnabled: false,
  opacity: 0.9,
  accentColor: 'teal',
  nudgeSensitivity: 'balanced',
  alwaysOnTop: true,
  autoCollapse: false,
};

export const MOCK_SESSION_UPDATE: SessionUpdate = {
  currentApp: 'Visual Studio Code',
  currentAppProcess: 'Visual Studio Code',
  currentAppBundle: 'com.microsoft.VSCode',
  currentAppTitle: 'src/main.ts — focusghost',
  category: 'focus',
  switchCount: 3,
  elapsedSec: 720,
  focusSec: 600,
  driftSec: 120,
  ghostState: 'calm',
  recentSwitches: [
    { app: 'Visual Studio Code', category: 'focus',       timestamp: Date.now() - 10000  },
    { app: 'Google Chrome',      category: 'research',    timestamp: Date.now() - 40000  },
    { app: 'Terminal',           category: 'focus',       timestamp: Date.now() - 90000  },
    { app: 'YouTube',            category: 'distraction', timestamp: Date.now() - 180000 },
    { app: 'Visual Studio Code', category: 'focus',       timestamp: Date.now() - 240000 },
  ],
};

export const MOCK_RECAP: SessionRecapPayload = {
  task: 'algorithms homework',
  durationMin: 30,
  focusSec: 1440,
  driftSec: 360,
  totalSwitches: 11,
  nudgesReceived: 2,
  nudgesDismissedAsBreak: 1,
  appBreakdown: [
    { app: 'Visual Studio Code', category: 'focus',       seconds: 1200 },
    { app: 'Google Chrome',      category: 'research',    seconds: 420  },
    { app: 'YouTube',            category: 'distraction', seconds: 180  },
  ],
  insight: "You stayed focused for the first 20 minutes — your best stretch yet. YouTube pulled you away right when you hit the recursion section. Next time, try closing that tab before you start.",
  switchLog: [],
};

export const MOCK_CHAT_HISTORY: ChatEntry[] = [
  { role: 'ghost', content: "Noticed you've been cycling between VS Code and Chrome — what's snagging you?", timestamp: Date.now() - 120000 },
  { role: 'user',  content: "I keep getting this TypeError I can't figure out",                               timestamp: Date.now() - 90000  },
  { role: 'ghost', content: "Try explaining the function out loud before Googling. What does it expect vs. what's it getting?", timestamp: Date.now() - 60000 },
];
