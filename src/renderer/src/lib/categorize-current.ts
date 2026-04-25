// Lightweight renderer-side guess of an app's category, used only to color
// the AppPill in real time without an IPC roundtrip on every window switch.
// The authoritative categorization still happens in main/categorization.ts
// when intervals are recorded.

import type { ActiveWindowInfo, AppCategory } from "@shared/types"

const TASK_HINTS = [
  "code",
  "vscode",
  "cursor",
  "figma",
  "notion",
  "obsidian",
  "linear",
  "xcode",
  "intellij",
  "iterm",
  "terminal",
]

const DRIFT_HINTS = [
  "twitter",
  "x.com",
  "reddit",
  "youtube",
  "tiktok",
  "instagram",
  "facebook",
  "discord",
  "netflix",
  "twitch",
  "messages",
  "imessage",
  "whatsapp",
]

export function categoryFor(
  win: ActiveWindowInfo | null | undefined,
  taskDescription: string
): AppCategory {
  if (!win) return "unknown"
  const hay = `${win.app} ${win.title} ${win.url ?? ""}`.toLowerCase()
  // If the task description names the current app, treat as task.
  const td = taskDescription.toLowerCase()
  if (td && win.app && td.includes(win.app.toLowerCase())) return "task"
  if (TASK_HINTS.some((h) => hay.includes(h))) return "task"
  if (DRIFT_HINTS.some((h) => hay.includes(h))) return "drift"
  return "context"
}
