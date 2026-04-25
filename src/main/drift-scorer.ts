import type { AppInterval, DriftSnapshot } from "@shared/types"

/**
 * Compute the drift score from session intervals.
 *
 * Score formula (0-100, higher = more drift):
 *
 *   recencyDrift = ms in `drift` apps in the last 5 minutes
 *   recentTotal  = ms tracked in the last 5 minutes
 *   recencyRatio = recencyDrift / recentTotal     (weight: 0.7)
 *
 *   sessionDrift = total drift ms / total active ms   (weight: 0.3)
 *
 *   score = round( (0.7 * recencyRatio + 0.3 * sessionRatio) * 100 )
 *
 * Recency dominates so a quick task-switch back to coding pulls the score
 * down fast; the session-wide ratio prevents the score from collapsing to
 * 0 if the user briefly returns to task work mid-binge.
 */
export function computeDrift(intervals: AppInterval[], now: number): DriftSnapshot {
  const fiveMinAgo = now - 5 * 60 * 1000

  let driftMs = 0
  let taskMs = 0
  let contextMs = 0
  let totalActiveMs = 0

  let recentDrift = 0
  let recentTotal = 0

  for (const i of intervals) {
    const dur = Math.max(0, i.end - i.start)
    if (dur === 0) continue
    totalActiveMs += dur

    switch (i.category) {
      case "drift":
        driftMs += dur
        break
      case "task":
        taskMs += dur
        break
      case "context":
        contextMs += dur
        break
      default:
        break
    }

    // Compute the portion of this interval that lies inside the recency window.
    const overlapStart = Math.max(i.start, fiveMinAgo)
    const overlapEnd = Math.min(i.end, now)
    const overlap = Math.max(0, overlapEnd - overlapStart)
    if (overlap > 0) {
      recentTotal += overlap
      if (i.category === "drift") recentDrift += overlap
    }
  }

  const recencyRatio = recentTotal > 0 ? recentDrift / recentTotal : 0
  const sessionRatio = totalActiveMs > 0 ? driftMs / totalActiveMs : 0
  const score = Math.round((0.7 * recencyRatio + 0.3 * sessionRatio) * 100)

  return {
    score: clamp(score, 0, 100),
    driftMs,
    taskMs,
    contextMs,
    totalActiveMs,
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}
