import type { AppCategory, CategorizationContext, CategoryRule } from "@shared/types"
import { BUILTIN_APP_CATEGORIES } from "@shared/constants"
import { getAppOverride, getSettings } from "./store"

/**
 * Classify an (app, title, url) into a category.
 *
 * Priority:
 *  1. User overrides (via right-click "Mark as task / drift / context")
 *  2. Custom rules from settings
 *  3. Task-description fuzzy match (if app/title contains words from the task)
 *  4. Built-in known apps
 *  5. Fallback: "neutral"
 *
 * The Ghost AI categorization in Sprint 3 layers on top by suggesting
 * additions to `taskApps` / `driftApps`, which become user overrides.
 */
export function categorize(
  app: string,
  title: string,
  url: string | null | undefined,
  ctx: CategorizationContext
): AppCategory {
  const appLower = app.toLowerCase().trim()
  const titleLower = title.toLowerCase()
  const urlLower = (url ?? "").toLowerCase()

  // 1. User override wins over everything.
  const override = getAppOverride(app)
  if (override) return override as AppCategory

  // 2. Explicit task/drift/context apps from the active session.
  if (ctx.taskApps.some((a) => appLower.includes(a.toLowerCase()))) return "task"
  if (ctx.driftApps.some((a) => appLower.includes(a.toLowerCase()))) return "drift"
  if (ctx.contextApps.some((a) => appLower.includes(a.toLowerCase()))) return "context"

  // 3. Custom rules from settings.
  for (const rule of ctx.rules) {
    if (matchesRule(rule, appLower, titleLower, urlLower)) return rule.category
  }

  // 4. Task description fuzzy match (very lightweight).
  // If the user said "writing my essay" and the title contains "essay", treat as task.
  const taskWords = tokenize(ctx.taskDescription)
  const titleWords = new Set(tokenize(title))
  const overlap = taskWords.filter((w) => titleWords.has(w)).length
  if (taskWords.length >= 2 && overlap >= 2) return "task"

  // 5. Built-in defaults.
  for (const [key, cat] of Object.entries(BUILTIN_APP_CATEGORIES)) {
    if (appLower.includes(key)) return cat as AppCategory
  }

  // 6. Browser URL hints.
  if (urlLower) {
    if (/(youtube|reddit|twitter|x\.com|tiktok|instagram|facebook|netflix|twitch)/.test(urlLower)) {
      return "drift"
    }
    if (/(github|gitlab|stackoverflow|developer\.mozilla|docs\.|notion|linear|figma)/.test(urlLower)) {
      return "context"
    }
  }

  return "neutral"
}

function matchesRule(
  rule: CategoryRule,
  appLower: string,
  titleLower: string,
  urlLower: string
): boolean {
  if (rule.appPattern && !appLower.includes(rule.appPattern.toLowerCase())) return false
  if (rule.titlePattern && !titleLower.includes(rule.titlePattern.toLowerCase())) return false
  if (rule.urlPattern && !urlLower.includes(rule.urlPattern.toLowerCase())) return false
  // At least one pattern must be present for a rule to match.
  return Boolean(rule.appPattern || rule.titlePattern || rule.urlPattern)
}

const STOPWORDS = new Set([
  "a", "the", "an", "and", "or", "but", "for", "of", "in", "on", "to", "with",
  "my", "our", "your", "is", "be", "do", "doing", "make", "making", "work",
  "working", "task", "thing", "stuff", "some",
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
}

/**
 * Build a CategorizationContext for the current session, pulling user
 * overrides plus any taskApps the AI has hinted at.
 */
export function buildCategorizationContext(
  taskDescription: string,
  taskApps: string[] = [],
  driftApps: string[] = [],
  contextApps: string[] = []
): CategorizationContext {
  return {
    taskDescription,
    taskApps,
    driftApps,
    contextApps,
    rules: getSettings().categoryRules,
  }
}
