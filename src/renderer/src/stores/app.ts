import { writable, derived, type Writable, type Readable } from "svelte/store";
import type {
  SessionUpdate,
  SessionRecapPayload,
  ChatEntry,
  NudgePayload,
  GhostMascotState,
} from "@shared/ipc-contract";

export const MOCK_SESSION_UPDATE: SessionUpdate = {
  currentApp: "Visual Studio Code",
  currentAppBundle: "com.microsoft.VSCode",
  category: "focus",
  switchCount: 3,
  elapsedSec: 720,
  focusSec: 600,
  driftSec: 120,
  ghostState: "calm",
  recentSwitches: [],
};

export const MOCK_RECAP: SessionRecapPayload = {
  task: "algorithms homework",
  durationMin: 30,
  focusSec: 1440,
  driftSec: 360,
  totalSwitches: 11,
  nudgesReceived: 2,
  nudgesDismissedAsBreak: 1,
  appBreakdown: [
    { app: "Visual Studio Code", category: "focus", seconds: 1200 },
    { app: "Google Chrome", category: "research", seconds: 420 },
    { app: "YouTube", category: "distraction", seconds: 180 },
  ],
  insight:
    "You stayed focused for the first 20 minutes — your best stretch yet. YouTube pulled you away right when you hit the recursion section. Next time, try closing that tab before you start.",
  switchLog: [],
};

export const MOCK_CHAT_HISTORY: ChatEntry[] = [
  {
    role: "ghost",
    content: "Noticed you've been cycling between VS Code and Chrome — what's snagging you?",
    timestamp: Date.now() - 120000,
  },
  {
    role: "user",
    content: "I keep getting this TypeError I can't figure out",
    timestamp: Date.now() - 90000,
  },
  {
    role: "ghost",
    content:
      "Try explaining the function out loud before Googling. What does it expect vs. what's it getting?",
    timestamp: Date.now() - 60000,
  },
];

export type Screen = "declare" | "session" | "chat" | "recap" | "settings";

export const screen: Writable<Screen> = writable("declare");
export const recap: Writable<SessionRecapPayload | null> = writable(null);
export const activeTask: Writable<string> = writable("");
export const activeMins: Writable<number> = writable(30);

export const sessionUpdate: Writable<SessionUpdate> = writable(MOCK_SESSION_UPDATE);
export const nudge: Writable<NudgePayload | null> = writable(null);
export const chatHistory: Writable<ChatEntry[]> = writable(MOCK_CHAT_HISTORY);
export const isThinking: Writable<boolean> = writable(false);

export function goToSession(task: string, durationMin: number): void {
  activeTask.set(task);
  activeMins.set(durationMin);
  screen.set("session");
}

export function goToChat(): void {
  screen.set("chat");
}

export function goToRecap(data: SessionRecapPayload): void {
  recap.set(data);
  screen.set("recap");
}

export function goToDeclare(): void {
  recap.set(null);
  screen.set("declare");
}

export function goToSettings(): void {
  screen.set("settings");
}

export function resetSessionState(): void {
  sessionUpdate.set(MOCK_SESSION_UPDATE);
  nudge.set(null);
  chatHistory.set(MOCK_CHAT_HISTORY);
  isThinking.set(false);
}