import { EventEmitter } from "node:events"
import type { ActiveWindowInfo } from "@shared/types"
import { POLL_INTERVAL_MS } from "@shared/constants"

/**
 * Polls the OS for the currently focused window and emits "window" whenever
 * the (app, title) pair changes.
 *
 * `active-win` is dynamically imported because:
 *   - On macOS it requires Accessibility permission. If the user has not
 *     granted it, the call throws — we want to keep running and fall back
 *     to demo mode rather than crash.
 *   - It's a native ESM module that pulls in platform-specific binaries; a
 *     dynamic import avoids breaking electron-vite's main bundle on systems
 *     where the binary fails to load.
 */
export class WindowTracker extends EventEmitter {
  private timer: NodeJS.Timeout | null = null
  private lastKey = ""
  private demoMode = false
  private demoApps: ActiveWindowInfo[] = []
  private demoIdx = 0

  /**
   * Start polling. If `demo` is true, emits a scripted sequence of windows
   * instead of calling active-win.
   */
  start(demo = false): void {
    this.stop()
    this.demoMode = demo
    if (demo) {
      this.demoApps = makeDemoSequence()
      this.demoIdx = 0
    }
    this.tick()
    this.timer = setInterval(() => this.tick(), POLL_INTERVAL_MS)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.lastKey = ""
  }

  /** For demo mode: jump to a specific kind of window on next tick. */
  forceDemoEvent(kind: "task" | "context" | "drift" | "neutral"): void {
    if (!this.demoMode) return
    const idx = this.demoApps.findIndex((w) => guessCategory(w.app) === kind)
    if (idx >= 0) this.demoIdx = idx
  }

  private async tick(): Promise<void> {
    const info = this.demoMode ? this.nextDemo() : await this.sampleReal()
    if (!info) return
    const key = `${info.app}::${info.title}`
    if (key !== this.lastKey) {
      this.lastKey = key
      this.emit("window", info)
    }
  }

  private nextDemo(): ActiveWindowInfo | null {
    if (this.demoApps.length === 0) return null
    const next = this.demoApps[this.demoIdx % this.demoApps.length]
    this.demoIdx += 1
    return { ...next, timestamp: Date.now() }
  }

  private async sampleReal(): Promise<ActiveWindowInfo | null> {
    try {
      // Lazy import to survive missing native binary or denied permissions.
      const mod = await import("active-win")
      const activeWin = mod.default
      const win = await activeWin()
      if (!win) return null
      const info: ActiveWindowInfo = {
        app: win.owner?.name ?? "Unknown",
        title: win.title ?? "",
        bundleId: (win.owner as { bundleId?: string } | undefined)?.bundleId ?? null,
        url: (win as { url?: string }).url ?? null,
        timestamp: Date.now(),
      }
      return info
    } catch (err) {
      // Don't spam — log once per minute when active-win is unavailable.
      const now = Date.now()
      if (now - this.lastErrorAt > 60_000) {
        this.lastErrorAt = now
        // eslint-disable-next-line no-console
        console.warn(
          "[FocusGhost] active-win failed; falling back to no-op. Did you grant Accessibility permission?",
          err instanceof Error ? err.message : err
        )
      }
      return null
    }
  }

  private lastErrorAt = 0
}

function makeDemoSequence(): ActiveWindowInfo[] {
  const now = Date.now()
  return [
    { app: "Code", title: "session-fsm.ts — focusghost", bundleId: "com.microsoft.VSCode", url: null, timestamp: now },
    { app: "Code", title: "session-fsm.ts — focusghost", bundleId: "com.microsoft.VSCode", url: null, timestamp: now },
    { app: "Slack", title: "#general — Slack", bundleId: "com.tinyspeck.slackmacgap", url: null, timestamp: now },
    { app: "Code", title: "drift-scorer.ts — focusghost", bundleId: "com.microsoft.VSCode", url: null, timestamp: now },
    { app: "Twitter", title: "Home / X", bundleId: "com.twitter.web", url: "https://x.com/home", timestamp: now },
    { app: "YouTube", title: "Lo-fi beats to focus to — YouTube", bundleId: null, url: "https://youtube.com/watch?v=demo", timestamp: now },
    { app: "Code", title: "App.svelte — focusghost", bundleId: "com.microsoft.VSCode", url: null, timestamp: now },
    { app: "Notion", title: "Project notes — Notion", bundleId: "notion.id", url: null, timestamp: now },
  ]
}

function guessCategory(app: string): "task" | "context" | "drift" | "neutral" {
  const a = app.toLowerCase()
  if (/code|cursor|xcode|figma|terminal/.test(a)) return "task"
  if (/slack|notion|mail|linear/.test(a)) return "context"
  if (/twitter|youtube|reddit|tiktok|instagram/.test(a)) return "drift"
  return "neutral"
}
