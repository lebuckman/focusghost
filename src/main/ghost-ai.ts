import { generateText, generateObject } from "ai"
import { z } from "zod"
import type {
  AppInterval,
  DriftSnapshot,
  GhostMessage,
  NudgePayload,
  SessionData,
} from "@shared/types"

/**
 * Ghost AI — a single module wrapping every Gemini call FocusGhost makes.
 *
 * Model: `google/gemini-3-flash` via the Vercel AI Gateway. Zero-config
 * (no provider package needed) so long as either AI_GATEWAY_API_KEY is set
 * or the user has linked their Vercel project's gateway.
 *
 * Personality: warm, dry, never patronizing. Two-sentence max.
 *
 * Every public function below has a deterministic fallback so FocusGhost
 * remains useful when:
 *   • the user has disabled Ghost AI in Settings
 *   • the API key is missing
 *   • the gateway returns an error
 *
 * The orchestration layer in main/index.ts decides which to call and when.
 */

const MODEL = "google/gemini-3-flash"

const SYSTEM_PROMPT = `You are FocusGhost — a warm, dry, slightly dorky productivity ghost living in a translucent overlay window. You watch the user's window switches but never read content; you only know app names and titles. You are succinct (1-2 sentences max), never patronizing, never use exclamation marks, and never use emojis. You speak as a calm friend, not a coach.`

interface NudgeContext {
  taskDescription: string
  drift: DriftSnapshot
  recentApps: string[]
  loopApps?: [string, string]
}

export interface CategorizationResult {
  taskApps: string[]
  driftApps: string[]
  contextApps: string[]
}

/** Whether AI is enabled at runtime. */
export function isAIEnabled(enabled: boolean): boolean {
  if (!enabled) return false
  // The AI Gateway is zero-config inside Vercel, but for local Electron use
  // an API key is required. Both env names are supported.
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN)
}

// ─── Categorization ──────────────────────────────────────────────────────

/**
 * Given the user's task description, predict which kinds of apps would be
 * "task" / "drift" / "context" for this session. The result is fed into
 * the categorization context so the live drift score is accurate from the
 * first window switch.
 *
 * The model is asked for *generic app names* (e.g. "vscode", "figma",
 * "youtube"); the categorizer does fuzzy substring matches against the
 * actual `app` strings reported by `active-win`.
 */
export async function categorizeForTask(
  task: string,
  enabled: boolean
): Promise<CategorizationResult> {
  if (!isAIEnabled(enabled)) return fallbackCategorization(task)
  try {
    const { object } = await generateObject({
      model: MODEL,
      system: SYSTEM_PROMPT,
      schema: z.object({
        taskApps: z.array(z.string()).describe("App names that directly help complete this task."),
        driftApps: z
          .array(z.string())
          .describe("App names that would distract from this task (entertainment, social)."),
        contextApps: z
          .array(z.string())
          .describe("App names that support this task without being it (chat, docs, browser for research)."),
      }),
      prompt: `The user's task: "${task}"\n\nList lowercase generic app names (no descriptions) for each bucket. Use 3-6 entries per bucket.`,
    })
    return {
      taskApps: dedupe(object.taskApps),
      driftApps: dedupe(object.driftApps),
      contextApps: dedupe(object.contextApps),
    }
  } catch (err) {
    console.warn("[ghost-ai] categorizeForTask failed, falling back:", err)
    return fallbackCategorization(task)
  }
}

// ─── Nudge generation ────────────────────────────────────────────────────

/**
 * Generate a short ghost-voice nudge for a triggered signal. Always returns
 * a NudgePayload — falls back to a deterministic line if AI is off/erroring.
 */
export async function generateNudge(
  kind: NudgePayload["kind"],
  ctx: NudgeContext,
  enabled: boolean
): Promise<NudgePayload> {
  const ts = Date.now()
  if (!isAIEnabled(enabled)) {
    return { kind, timestamp: ts, message: fallbackNudge(kind, ctx) }
  }
  try {
    const { text } = await generateText({
      model: MODEL,
      system: SYSTEM_PROMPT,
      prompt: nudgePrompt(kind, ctx),
    })
    const trimmed = text.trim().slice(0, 220)
    return { kind, timestamp: ts, message: trimmed || fallbackNudge(kind, ctx) }
  } catch (err) {
    console.warn(`[ghost-ai] generateNudge(${kind}) failed:`, err)
    return { kind, timestamp: ts, message: fallbackNudge(kind, ctx) }
  }
}

// ─── Freeform chat ───────────────────────────────────────────────────────

interface ChatContext {
  taskDescription: string | null
  drift: DriftSnapshot | null
  recentApps: string[]
  state: SessionData["state"] | null
}

export async function chatReply(
  history: GhostMessage[],
  userMessage: string,
  ctx: ChatContext,
  enabled: boolean
): Promise<string> {
  if (!isAIEnabled(enabled)) return fallbackChatReply(userMessage, ctx)
  try {
    const messages = history
      .slice(-12)
      .map((m) => ({
        role: (m.role === "ghost" ? "assistant" : m.role) as "user" | "assistant" | "system",
        content: m.content,
      }))
    messages.push({ role: "user", content: userMessage })

    const { text } = await generateText({
      model: MODEL,
      system: `${SYSTEM_PROMPT}\n\nLive context:\n${formatChatContext(ctx)}\n\nIf the user is stuck, suggest one tiny next step. Never lecture.`,
      messages,
    })
    return text.trim() || fallbackChatReply(userMessage, ctx)
  } catch (err) {
    console.warn("[ghost-ai] chatReply failed:", err)
    return fallbackChatReply(userMessage, ctx)
  }
}

// ─── Recap insight ───────────────────────────────────────────────────────

export async function recapInsight(
  session: SessionData,
  enabled: boolean
): Promise<string> {
  if (!isAIEnabled(enabled)) return fallbackRecap(session)
  try {
    const top = topApps(session.intervals, 5)
    const total = Math.max(1, session.drift.totalActiveMs)
    const taskPct = Math.round((session.drift.taskMs / total) * 100)
    const driftPct = Math.round((session.drift.driftMs / total) * 100)
    const { text } = await generateText({
      model: MODEL,
      system: SYSTEM_PROMPT,
      prompt: `Session recap data:
- Task: "${session.taskDescription}"
- Total active: ${formatMin(session.drift.totalActiveMs)}
- On-task: ${taskPct}% | Drift: ${driftPct}% | Drift score: ${session.drift.score}/100
- Top apps: ${top.map((u) => `${u.app} (${formatMin(u.totalMs)})`).join(", ")}
- User reflection: ${session.reflection ?? "(none)"}

Write one warm, dry, two-sentence-max recap. Mention one concrete pattern if obvious. Do not say "great job" or anything saccharine.`,
    })
    return text.trim() || fallbackRecap(session)
  } catch (err) {
    console.warn("[ghost-ai] recapInsight failed:", err)
    return fallbackRecap(session)
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function nudgePrompt(kind: NudgePayload["kind"], ctx: NudgeContext): string {
  const apps = ctx.recentApps.slice(0, 4).join(", ") || "(none)"
  const head = `User's task: "${ctx.taskDescription}". Drift score: ${ctx.drift.score}/100. Recent apps: ${apps}.`
  switch (kind) {
    case "drift":
      return `${head}\n\nThe user has drifted away from their task. Write a single sentence — calm, specific to the drift apps if you can name one — inviting them back. No questions, no exclamation marks.`
    case "stuck":
      return `${head}\n\nThe user appears stuck — they've been switching apps but not making progress on the task. Write one sentence asking what's blocking them, or suggesting they tell you what's hard. Warm, not patronizing.`
    case "pattern":
      const loop = ctx.loopApps ? `between ${ctx.loopApps[0]} and ${ctx.loopApps[1]}` : "between a few apps"
      return `${head}\n\nThe user has been bouncing ${loop}. Write one sentence noting the loop in a kind, observational way — like a friend would.`
    case "encouragement":
      return `${head}\n\nThe user is doing well — mostly on task. Write one short, dry, sincere acknowledgement. Avoid clichés.`
    case "recap-insight":
      return `${head}\n\nWrite one short post-session reflection.`
  }
}

function formatChatContext(ctx: ChatContext): string {
  const parts: string[] = []
  if (ctx.taskDescription) parts.push(`Task: "${ctx.taskDescription}"`)
  if (ctx.state) parts.push(`State: ${ctx.state}`)
  if (ctx.drift) {
    const total = Math.max(1, ctx.drift.totalActiveMs)
    parts.push(
      `On-task: ${Math.round((ctx.drift.taskMs / total) * 100)}% | Drift: ${Math.round((ctx.drift.driftMs / total) * 100)}% (score ${ctx.drift.score}/100)`
    )
  }
  if (ctx.recentApps.length) parts.push(`Recent apps: ${ctx.recentApps.slice(0, 5).join(", ")}`)
  return parts.length ? parts.join("\n") : "(no active session)"
}

function topApps(
  intervals: AppInterval[],
  n: number
): { app: string; totalMs: number }[] {
  const map = new Map<string, number>()
  for (const i of intervals) map.set(i.app, (map.get(i.app) ?? 0) + i.duration)
  return [...map.entries()]
    .map(([app, totalMs]) => ({ app, totalMs }))
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, n)
}

function formatMin(ms: number): string {
  return `${Math.round(ms / 60000)}m`
}

function dedupe(xs: string[]): string[] {
  return [...new Set(xs.map((x) => x.trim().toLowerCase()).filter(Boolean))]
}

// ─── Deterministic fallbacks ─────────────────────────────────────────────

function fallbackCategorization(task: string): CategorizationResult {
  const t = task.toLowerCase()
  const isCode = /(code|bug|deploy|api|refactor|review|merge|pr|test)/.test(t)
  const isWrite = /(write|draft|essay|email|doc|post|blog|notes)/.test(t)
  const isDesign = /(design|figma|mockup|ui|ux|sketch|diagram|wireframe)/.test(t)
  const taskApps: string[] = []
  if (isCode) taskApps.push("code", "vscode", "cursor", "terminal", "warp", "iterm")
  if (isWrite) taskApps.push("notion", "word", "docs", "obsidian", "bear", "ulysses")
  if (isDesign) taskApps.push("figma", "sketch", "illustrator", "affinity")
  if (!taskApps.length) taskApps.push("notion", "docs", "code", "obsidian")
  return {
    taskApps,
    driftApps: ["youtube", "twitter", "x", "reddit", "tiktok", "instagram", "discord", "netflix"],
    contextApps: ["slack", "mail", "outlook", "linear", "jira", "zoom", "calendar"],
  }
}

function fallbackNudge(kind: NudgePayload["kind"], ctx: NudgeContext): string {
  const task = ctx.taskDescription ? `"${ctx.taskDescription}"` : "your task"
  const lastDrift = ctx.recentApps.find((a) => a.length > 0) ?? null
  switch (kind) {
    case "drift":
      return lastDrift
        ? `You've slipped into ${lastDrift}. Want to come back to ${task}?`
        : `You've drifted away from ${task}. I'm right here when you're ready.`
    case "stuck":
      return `Looks like you're spinning. Tell me what's hard about ${task}?`
    case "pattern":
      return ctx.loopApps
        ? `You've bounced between ${ctx.loopApps[0]} and ${ctx.loopApps[1]} a few times. Need to step back?`
        : `You've been jumping between apps. Want to slow down for a sec?`
    case "encouragement":
      return `Solid stretch. You're mostly on task.`
    case "recap-insight":
      return `Session done. Take a breath.`
  }
}

function fallbackChatReply(userMessage: string, ctx: ChatContext): string {
  if (!ctx.taskDescription) {
    return "Ghost AI is offline, but I'm here. Set a task and we can start a session."
  }
  if (/stuck|hard|blocked|can'?t/i.test(userMessage)) {
    return `Pick the smallest possible next move on "${ctx.taskDescription}" — even one line, one sentence. Tell me what it is.`
  }
  if (/done|finished|finally/i.test(userMessage)) {
    return `Wrap it. End the session and I'll show you the recap.`
  }
  return `(Ghost AI is offline.) Last I saw, you were on "${ctx.taskDescription}". Want to try a tiny next step?`
}

function fallbackRecap(session: SessionData): string {
  const total = Math.max(1, session.drift.totalActiveMs)
  const taskPct = Math.round((session.drift.taskMs / total) * 100)
  if (taskPct >= 70) {
    return `Mostly on task — ${taskPct}% in the right places. That's a win in any week.`
  }
  if (taskPct >= 40) {
    return `Mixed session — ${taskPct}% on task. The drift was real but you kept coming back.`
  }
  return `Tough one — only ${taskPct}% on task. No judgement; sometimes the work is the friction itself.`
}
