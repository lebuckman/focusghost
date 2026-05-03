import type {
  SessionRecapPayload,
  WindowCategory,
} from "../../shared/ipc-contract";
import type { SessionState } from "./sessionTypes";

export function buildRecap(currentSession: SessionState): SessionRecapPayload {
  const appTime = new Map<
    string,
    { seconds: number; category: WindowCategory }
  >();
  const entries = currentSession.switchLog;
  for (let i = 0; i < entries.length; i++) {
    const from = entries[i].timestamp;
    const to = i + 1 < entries.length ? entries[i + 1].timestamp : Date.now();
    const secs = Math.max(0, Math.floor((to - from) / 1000));
    const existing = appTime.get(entries[i].app);
    if (existing) {
      existing.seconds += secs;
    } else {
      appTime.set(entries[i].app, {
        seconds: secs,
        category: entries[i].category,
      });
    }
  }

  const appBreakdown = Array.from(appTime.entries())
    .map(([appName, { seconds, category }]) => ({
      app: appName,
      category,
      seconds,
    }))
    .sort((a, b) => b.seconds - a.seconds);

  const totalSec = Math.max(
    1,
    currentSession.focusSec + currentSession.driftSec,
  );
  const focusPct = Math.round((currentSession.focusSec / totalSec) * 100);
  let insight: string;
  if (focusPct >= 80) {
    insight = `Strong session - you stayed focused ${focusPct}% of the time on "${currentSession.task}". Keep that streak going.`;
  } else if (focusPct >= 60) {
    insight = `Decent focus at ${focusPct}% on "${currentSession.task}". A few drifts but you pulled back. Try closing distracting tabs before the next session.`;
  } else {
    insight = `Tough one - only ${focusPct}% focus time. Identify what pulled you away from "${currentSession.task}" and eliminate it before the next session.`;
  }

  return {
    task: currentSession.task,
    durationMin: currentSession.durationMin,
    focusSec: currentSession.focusSec,
    driftSec: currentSession.driftSec,
    totalSwitches: currentSession.switchCount,
    nudgesReceived: currentSession.nudgeLog.length,
    nudgesDismissedAsBreak: 0,
    appBreakdown,
    insight,
    switchLog: currentSession.switchLog,
  };
}
