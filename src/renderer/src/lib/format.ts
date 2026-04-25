// Time and number formatting helpers. Keep tiny and pure.

export function formatHMS(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => n.toString().padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export function formatMinutes(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  const s = totalSec % 60
  return `${s}s`
}

export function formatPercent(score: number): string {
  return `${Math.round(Math.max(0, Math.min(100, score)))}%`
}

export function relativeTime(ts: number, now = Date.now()): string {
  const diffSec = Math.floor((now - ts) / 1000)
  if (diffSec < 30) return "just now"
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return new Date(ts).toLocaleDateString()
}

/** Pretty-print an app name (drop ".exe", trim, etc.). */
export function prettyAppName(app: string): string {
  return app.replace(/\.exe$/i, "").replace(/\.app$/i, "").trim() || "Unknown"
}
