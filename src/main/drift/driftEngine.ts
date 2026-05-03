import type { ActivityCategory } from "../../shared/classificationTypes";
import type { NudgePayload, WindowCategory } from "../../shared/ipc-contract";
import type { SessionState } from "../session/sessionTypes";
import {
  DISTRACTION_FIRM_SEC,
  PATTERN_VISIT_COUNT,
  PATTERN_WINDOW_SEC,
  STUCK_SWITCH_COUNT,
  STUCK_WINDOW_SEC,
  STUCK_RECENCY_SEC,
  IDLE_TRIGGER_SEC,
  MILESTONE_STREAK_SEC,
} from "./driftConstants";

type SessionContext = Record<string, unknown>;

type FireNudge = (payload: NudgePayload, force?: boolean) => Promise<boolean>;

type DriftEngineDeps = {
  getSession: () => SessionState | null;
  fireNudge: FireNudge;
  sessionContext: () => SessionContext;
  getSystemIdleTime: () => number;
};

export type DriftEngine = {
  checkFrequencyDrift: (now: number) => Promise<void>;
  checkDistractionDrift: (
    processName: string,
    distractionKey: string,
    category: WindowCategory,
    activityCategory: ActivityCategory,
    now: number,
  ) => Promise<void>;
  checkStuckDrift: (now: number) => Promise<void>;
  checkInactivity: (now: number) => Promise<void>;
  checkMilestone: (now: number) => Promise<void>;
};

export function createDriftEngine({
  getSession,
  fireNudge,
  sessionContext,
  getSystemIdleTime,
}: DriftEngineDeps): DriftEngine {
  async function checkFrequencyDrift(_now: number) {
    // Frequency data is tracked via session.switchLog/switchCount for stats.
    // No popup is fired — the inline in-app nudge component isn't wired yet,
    // and distraction/stuck nudges cover the meaningful drift cases.
    void _now;
  }

  async function checkDistractionDrift(
    processName: string, // OS app name — used for blockedApps lookup
    distractionKey: string, // site name for browsers, app name for desktop
    category: WindowCategory,
    activityCategory: ActivityCategory,
    now: number,
  ) {
    const session = getSession();
    if (!session) return;

    if (category !== "distraction") {
      session.distractionStartTime = null;
      return;
    }

    const isHard = activityCategory === "hard-distraction";
    const blockedUntil =
      session.blockedApps.get(distractionKey) ??
      session.blockedApps.get(processName);
    const isBlocked = blockedUntil !== undefined && now < blockedUntil;

    if (session.distractionStartTime === null) {
      // Hard distraction and blocked apps fire quickly — pre-subtract threshold to trigger next tick
      session.distractionStartTime =
        isHard || isBlocked ? now - DISTRACTION_FIRM_SEC * 1000 : now;
      return;
    }

    const consecutiveSec = (now - session.distractionStartTime) / 1000;
    if (consecutiveSec < (isHard || isBlocked ? 1 : DISTRACTION_FIRM_SEC))
      return;

    const windowStart = now - PATTERN_WINDOW_SEC * 1000;
    const history = session.distractionHistory[distractionKey] ?? [];
    const recentOccurrences = history.filter((t) => t >= windowStart).length;

    // Record occurrence and reset timer — prevents re-fire until threshold elapses again
    session.distractionHistory[distractionKey] = [
      ...history.filter((t) => t >= windowStart),
      now,
    ];
    session.distractionStartTime = now;

    if (isHard) {
      await fireNudge({
        type: "distraction-hard",
        tier: 2,
        message: `${distractionKey.toLowerCase()} — eyes on me. back to "${session.task}".`,
        driftType: "distraction",
        context: {
          appName: distractionKey,
          driftDurationSec: Math.round(consecutiveSec),
          ...sessionContext(),
        },
      });
    } else if (recentOccurrences >= PATTERN_VISIT_COUNT) {
      await fireNudge({
        type: "pattern-observational",
        tier: 2,
        message: `${distractionKey.toLowerCase()} again — want me to block it for the rest of the session?`,
        driftType: "distraction",
        context: {
          appName: distractionKey,
          driftDurationSec: Math.round(consecutiveSec),
          occurrences: recentOccurrences + 1,
          ...sessionContext(),
        },
      });
    } else {
      const blockMsg =
        isBlocked && blockedUntil
          ? `${distractionKey.toLowerCase()} is blocked — back to "${session.task}"?`
          : `you've been on ${distractionKey.toLowerCase()} for ${Math.round(consecutiveSec)}s. "${session.task}" is still waiting.`;
      await fireNudge({
        type: "distraction-firm",
        tier: 2,
        message: blockMsg,
        driftType: "distraction",
        context: {
          appName: distractionKey,
          driftDurationSec: Math.round(consecutiveSec),
          occurrences: 1,
          blockUntil: blockedUntil,
          ...sessionContext(),
        },
      });
    }
  }

  async function checkStuckDrift(now: number) {
    const session = getSession();
    if (!session) return;

    // Prune entries older than the rolling window
    session.stuckRollingLog = session.stuckRollingLog.filter(
      (s) => s.timestamp >= now - STUCK_WINDOW_SEC * 1000,
    );

    if (session.stuckRollingLog.length < STUCK_SWITCH_COUNT) return;

    // Most recent switch must be recent — user is actively cycling right now
    const mostRecent =
      session.stuckRollingLog[session.stuckRollingLog.length - 1];
    if (now - mostRecent.timestamp > STUCK_RECENCY_SEC * 1000) return;

    // Fewer than 20% distraction switches — this is a focus/stuck pattern, not distraction drift
    const distractionCount = session.stuckRollingLog.filter(
      (s) => s.category === "distraction",
    ).length;
    if (distractionCount / session.stuckRollingLog.length >= 0.2) return;

    // Build a compact sequence of categories (remove consecutive duplicates)
    const recent = session.stuckRollingLog;
    const seq: WindowCategory[] = [];
    for (const s of recent) {
      if (seq.length === 0 || seq[seq.length - 1] !== s.category)
        seq.push(s.category);
    }

    // Count alternations between focus and non-focus that indicate cycling
    let alternations = 0;
    for (let i = 0; i + 1 < seq.length; i++) {
      const a = seq[i];
      const b = seq[i + 1];
      if (
        (a === "focus" && (b === "research" || b === "unknown")) ||
        (b === "focus" && (a === "research" || a === "unknown"))
      ) {
        alternations++;
      }
    }

    // If we see 3 or more alternations within the window, consider it stuck
    if (alternations < 3) return;

    const fired = await fireNudge({
      type: "stuck-helpful",
      tier: 2,
      message: `you've been cycling apps — what's snagging you?`,
      driftType: "stuck",
      context: { ...sessionContext() },
    });

    // Clear the log after firing so stuck can't re-fire on the same switch burst
    if (fired) session.stuckRollingLog = [];
  }

  async function checkInactivity(_now: number) {
    const session = getSession();
    if (!session) return;
    const idleSec = getSystemIdleTime();

    // Reset flag as soon as the user is active again
    if (idleSec < 5) {
      session.idleSoftFired = false;
      return;
    }

    // Fire once per idle stretch; force-replaces any existing popup
    if (idleSec >= IDLE_TRIGGER_SEC && !session.idleSoftFired) {
      session.idleSoftFired = true;
      await fireNudge(
        {
          type: "idle-soft",
          tier: 2,
          message: `still there? you've been away for ${Math.round(idleSec)}s.`,
          driftType: "distraction",
          context: { ...sessionContext() },
        },
        true /* force — idle overrides any existing popup */,
      );
    }
  }

  async function checkMilestone(now: number) {
    const session = getSession();
    if (!session) return;
    if (session.milestonesFired.has("25min")) return;

    if (session.lastCategory !== "focus") {
      // Reset streak whenever the user leaves a focus app
      session.focusStreakStart = null;
      return;
    }

    // Start the streak timer on first focus tick
    if (session.focusStreakStart === null) {
      session.focusStreakStart = now;
      return;
    }

    if (now - session.focusStreakStart >= MILESTONE_STREAK_SEC * 1000) {
      session.milestonesFired.add("25min");
      await fireNudge({
        type: "milestone-positive",
        tier: 2,
        message: `${MILESTONE_STREAK_SEC}s of continuous focus — solid work. keep it going.`,
        driftType: "frequency",
        context: { ...sessionContext() },
      });
    }
  }

  return {
    checkFrequencyDrift,
    checkDistractionDrift,
    checkStuckDrift,
    checkInactivity,
    checkMilestone,
  };
}
