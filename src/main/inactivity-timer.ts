import { EventEmitter } from "node:events"
import { powerMonitor } from "electron"

/**
 * Watches `powerMonitor.getSystemIdleTime()` and emits:
 *   - "idle"   when the user has been inactive for >= thresholdSec
 *   - "active" when the user becomes active again after being idle
 *
 * powerMonitor is the only Electron API that gives us global keyboard/mouse
 * idle time without any extra permissions, on all three desktop platforms.
 */
export class InactivityTimer extends EventEmitter {
  private timer: NodeJS.Timeout | null = null
  private isIdle = false
  private thresholdSec: number

  constructor(thresholdSec: number) {
    super()
    this.thresholdSec = Math.max(5, thresholdSec)
  }

  setThreshold(thresholdSec: number): void {
    this.thresholdSec = Math.max(5, thresholdSec)
  }

  start(): void {
    this.stop()
    this.timer = setInterval(() => this.tick(), 1000)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.isIdle = false
  }

  private tick(): void {
    let idleSec = 0
    try {
      idleSec = powerMonitor.getSystemIdleTime()
    } catch {
      // Some Linux environments don't support this — treat as always active.
      idleSec = 0
    }

    if (!this.isIdle && idleSec >= this.thresholdSec) {
      this.isIdle = true
      this.emit("idle", idleSec)
    } else if (this.isIdle && idleSec < this.thresholdSec) {
      this.isIdle = false
      this.emit("active")
    }
  }
}
