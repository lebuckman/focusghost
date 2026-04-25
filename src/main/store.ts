import Store from "electron-store"
import type { AppSettings, SessionData, GhostMessage } from "@shared/types"
import { DEFAULT_SETTINGS } from "@shared/constants"

interface Schema {
  settings: AppSettings
  sessions: SessionData[]
  chatHistory: GhostMessage[]
  /** App-name -> override category set by the user. */
  appOverrides: Record<string, string>
}

// electron-store handles JSON file IO and schema migration. All persistence
// for FocusGhost goes through this module so the rest of the app never has
// to touch the filesystem directly.
const store = new Store<Schema>({
  name: "focusghost",
  defaults: {
    settings: DEFAULT_SETTINGS,
    sessions: [],
    chatHistory: [],
    appOverrides: {},
  },
}) as unknown as Store<Schema> & {
  get: <K extends keyof Schema>(key: K) => Schema[K]
  set: <K extends keyof Schema>(key: K, value: Schema[K]) => void
}

export function getSettings(): AppSettings {
  // Merge with defaults so newly added settings keys auto-populate after upgrades.
  return { ...DEFAULT_SETTINGS, ...(store.get("settings") ?? {}) }
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...patch }
  store.set("settings", next)
  return next
}

export function getSessions(): SessionData[] {
  return store.get("sessions") ?? []
}

export function saveSession(session: SessionData): void {
  const sessions = getSessions()
  const idx = sessions.findIndex((s) => s.id === session.id)
  if (idx >= 0) sessions[idx] = session
  else sessions.push(session)
  // Keep the last 200 sessions to avoid unbounded growth.
  const trimmed = sessions.slice(-200)
  store.set("sessions", trimmed)
}

export function getChatHistory(): GhostMessage[] {
  return store.get("chatHistory") ?? []
}

export function appendChatMessage(msg: GhostMessage): void {
  const history = getChatHistory()
  history.push(msg)
  // Keep the last 500 messages.
  store.set("chatHistory", history.slice(-500))
}

export function clearChatHistory(): void {
  store.set("chatHistory", [])
}

export function getAppOverride(app: string): string | undefined {
  const map = store.get("appOverrides") ?? {}
  return map[app.toLowerCase()]
}

export function setAppOverride(app: string, category: string): void {
  const map = { ...(store.get("appOverrides") ?? {}) }
  map[app.toLowerCase()] = category
  store.set("appOverrides", map)
}

export function getAllAppOverrides(): Record<string, string> {
  return { ...(store.get("appOverrides") ?? {}) }
}
