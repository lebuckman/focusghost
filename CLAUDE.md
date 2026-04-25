# FocusGhost — CLAUDE.md

### PRD + Claude Code Guidance | BroncoHacks 2026 | Cal Poly Pomona

> This file is the single source of truth for the project. Claude Code reads it automatically. Teammates should reference it for architecture decisions, naming conventions, feature scope, and implementation details. **Do not make structural changes without team discussion.**

---

## 🧠 Product Overview

**One-line pitch:** FocusGhost is a desktop AI companion that watches your active window, detects when you're drifting or stuck, and gently nudges you back on track — without blocking or controlling you.

**The problem:** Students lose focus constantly and don't realize it. They open YouTube after 5 minutes of debugging, cycle between VS Code and Reddit without noticing, or get genuinely stuck and spiral into distraction. Existing productivity apps are blockers or timers — they don't understand _what_ you're doing or _why_ you drifted. FocusGhost does.

**The pitch for judges:** Frame it as a student self-awareness tool, not a productivity blocker. FocusGhost teaches students about their own attention patterns — when they drift, when they get stuck, and how to recover. The session recap and ghost chat are educational artifacts. This fits the **Education track** cleanly.

---

## 🏆 Hackathon Context

- **Event:** BroncoHacks 2026 — 24 hours (11:30am Sat → 12:30pm Sun)
- **Track:** Education
- **Submission:** Devpost by 12:30pm Sunday
- **Team:** 4 people

### Prize Targets

| Prize                            | Priority | Notes                                                  |
| -------------------------------- | -------- | ------------------------------------------------------ |
| Best Use of AI/ML                | Primary  | Core feature — context-aware nudges + ghost chat       |
| Best Use of Gemma 4 / Gemini API | Primary  | One model string change from Gemini Flash              |
| Best Use of Backboard            | Primary  | **MVP** — replaces stateless AI with persistent memory |
| Best UX/Design                   | Primary  | Compact always-on-top window with opacity + collapse   |
| Best Use of ElevenLabs           | Stretch  | Voice nudges — only if core is solid                   |
| Best Use of Auth0 AI Agents      | Stretch  | Identity layer on top of Backboard — last priority     |

---

## 📋 MVP Features

These must all be working before any stretch goal is touched.

1. **Task declaration** — user states task + duration (preset pills: 15m / 30m / 45m / 60m + custom input field)
2. **Active window polling** — every 2–3 seconds via `active-win`, OS-level detection
3. **Window categorization** — focus / research / distraction / inactive / unknown
4. **Inactivity detection** — no window change for 5+ min = inactive flag
5. **Drift detection** — all three patterns: frequency, distraction, stuck (see Drift Detection section)
6. **AI nudge overlay** — floating toast (separate BrowserWindow), Gemini/Gemma generates context-aware message; may also be a popup for more serious drift
7. **Ghost Chat** — persistent AI chat interface accessible anytime; ghost proactively observes and comments on behavior; triggered automatically on stuck drift; replaces the old 3-question stuck mode form
8. **Session recap** — focus time, drift time, switches, per-app time bars, AI-generated ghost insight
9. **Backboard memory** — every AI call is contextualized by persistent memory across sessions, not just current session

### Stretch Goals (in priority order)

- Collapsed window mode (single bar: ghost dot + task + timer + current app)
- Settings screen (opacity slider, accent color, nudge sensitivity, drift threshold, auto-collapse, always-on-top)
- System tray / menu bar icon
- ElevenLabs voice nudges
- Auth0 identity layer paired with Backboard

---

## 🔧 Tech Stack

| Layer              | Tool                                                                   |
| ------------------ | ---------------------------------------------------------------------- |
| Desktop framework  | Electron Forge + Vite plugin                                           |
| UI                 | React + TypeScript                                                     |
| Styling            | Inline `React.CSSProperties` (primary) + Tailwind (available)          |
| Window detection   | `active-win` npm package (ESM-only, dynamic import)                    |
| Local persistence  | `electron-store`                                                       |
| AI model           | Google Gemini API — `gemini-2.0-flash` or `gemma-3-27b-it` via env var |
| AI memory          | Backboard API — persistent memory across sessions                      |
| Voice (stretch)    | ElevenLabs REST API                                                    |
| Identity (stretch) | Auth0                                                                  |
| Design reference   | Claude design prototype → Claude Code handoff                          |

### Bootstrap Commands

```bash
npm init electron-app@latest focus-ghost -- --template=vite-typescript
cd focus-ghost
npm install react react-dom
npm install -D @types/react @types/react-dom
npm install active-win electron-store @google/generative-ai
npm install tailwindcss
```

### Dev Commands

```bash
npm start        # run in development (Electron + Vite HMR)
npm run lint     # ESLint over .ts/.tsx files
npm run package  # package without installer
npm run make     # build distributable installers
```

> **Note:** There is no test suite. Run the app live to verify changes. `npm run make` only builds for the current OS — designate one demo machine and build there.

---

## 🏗️ Architecture

### Electron Two-Process Model

```
Renderer Process (React UI — Chromium)
  ↕ window.electronAPI (contextBridge via preload.ts)
Main Process (Node.js — OS access)
  ├── active-win polling loop (every 2s)
  ├── drift detection logic
  ├── Gemini + Backboard API calls
  └── electron-store read/write
```

**The renderer NEVER calls OS APIs or AI APIs directly.** All OS and AI access goes through IPC via the preload bridge. This is a hard rule — violations will cause security warnings and potentially break the app.

### File Structure

```
src/
├── shared/
│   └── ipc-contract.ts     ← single source of truth — all IPC channels + types
├── main.ts                  ← Electron main process entry + session engine
├── preload.ts               ← contextBridge exposes window.electronAPI
├── renderer/
│   ├── App.tsx              ← screen state machine ('declare' | 'session' | 'chat' | 'recap')
│   ├── electron.d.ts        ← TypeScript types for window.electronAPI
│   ├── screens/
│   │   ├── TaskDeclaration.tsx
│   │   ├── ActiveSession.tsx
│   │   ├── GhostChat.tsx
│   │   └── SessionRecap.tsx
│   └── components/
│       ├── GhostMascot.tsx      ← animated SVG ghost, driven by GhostMascotState
│       ├── InAppNudge.tsx       ← inline nudge bar at bottom of ActiveSession
│       ├── NudgePopup.tsx       ← separate BrowserWindow popup, driven by NudgeType
│       └── MetricChip.tsx
└── index.css                ← global styles, .fg-scroll scrollbar class
```

### Session Engine (main.ts)

The main process owns all session state. On `START_SESSION`:

- Starts a `setInterval` polling `active-win` every 2 seconds
- Categorizes each window using the category map
- Accumulates `focusSec` and `driftSec`
- Checks drift thresholds and triggers nudges
- Pushes `SESSION_UPDATE` events to the renderer continuously

On `END_SESSION` or timer expiry:

- Builds `SessionRecap` object
- Calls Backboard to generate insight with historical context
- Sends `SESSION_RECAP` to renderer
- Clears session state from electron-store

`active-win` must be imported via dynamic `import()` (not static) because it is ESM-only. It must also be externalized in `vite.main.config.ts` so Vite doesn't attempt to bundle it as CJS.

---

## 📡 IPC Contract

> **`src/shared/ipc-contract.ts` — DO NOT CHANGE WITHOUT TEAM DISCUSSION.**
> This is the contract every teammate builds against. Agree on it in the first hour and freeze it.

```typescript
export const IPC = {
  // Renderer → Main
  START_SESSION: "START_SESSION",
  END_SESSION: "END_SESSION",
  CHAT_MESSAGE: "CHAT_MESSAGE", // user sends message to ghost
  DISMISS_NUDGE: "DISMISS_NUDGE", // "got it" / "back to work"
  NUDGE_ACTION: "NUDGE_ACTION", // user tapped a specific nudge button (i'm stuck, block, etc.)
  UPDATE_SETTINGS: "UPDATE_SETTINGS",

  // Main → Renderer
  SESSION_UPDATE: "SESSION_UPDATE",
  TRIGGER_NUDGE: "TRIGGER_NUDGE", // payload includes NudgeType + tier
  OPEN_GHOST_CHAT: "OPEN_GHOST_CHAT", // triggered by stuck/distraction drift
  GHOST_MESSAGE: "GHOST_MESSAGE", // ghost proactively sends a chat message
  CHAT_RESPONSE: "CHAT_RESPONSE", // response to user's chat message
  SESSION_RECAP: "SESSION_RECAP",
} as const;

// --- Payload Types ---

export interface StartSessionPayload {
  task: string;
  durationMin: number;
}

export interface SessionUpdate {
  currentApp: string;
  category: WindowCategory;
  switchCount: number;
  elapsedSec: number;
  focusSec: number;
  driftSec: number;
  recentSwitches: Array<{
    app: string;
    category: WindowCategory;
    timestamp: number;
  }>;
}

export interface NudgePayload {
  message: string;
  driftType: DriftType;
}

export interface ChatMessagePayload {
  message: string;
  chatHistory: ChatMessage[];
}

export interface GhostMessagePayload {
  message: string;
  trigger:
    | "stuck_drift"
    | "distraction_drift"
    | "frequency_drift"
    | "proactive"
    | "user_reply";
}

export interface SessionRecap {
  task: string;
  durationMin: number;
  focusSec: number;
  driftSec: number;
  totalSwitches: number;
  nudgesReceived: number;
  appBreakdown: Array<{
    app: string;
    category: WindowCategory;
    seconds: number;
  }>;
  insight: string;
}

// --- Shared Domain Types ---

export type WindowCategory =
  | "focus"
  | "research"
  | "distraction"
  | "inactive"
  | "unknown";
export type DriftType = "frequency" | "distraction" | "stuck";
export type GhostMascotState =
  | "calm"
  | "concerned"
  | "thinking"
  | "happy"
  | "sleepy";
export type ChatMessage = {
  role: "user" | "ghost";
  content: string;
  timestamp: number;
};
export type Screen = "declare" | "session" | "chat" | "recap";

// --- Mock Data (remove once real IPC flows) ---
export const MOCK_SESSION_UPDATE: SessionUpdate = {
  currentApp: "VS Code",
  category: "focus",
  switchCount: 4,
  elapsedSec: 720,
  focusSec: 600,
  driftSec: 120,
  recentSwitches: [
    { app: "VS Code", category: "focus", timestamp: Date.now() - 30000 },
    { app: "YouTube", category: "distraction", timestamp: Date.now() - 90000 },
    { app: "Chrome", category: "research", timestamp: Date.now() - 150000 },
  ],
};

export const MOCK_RECAP: SessionRecap = {
  task: "algorithms homework",
  durationMin: 30,
  focusSec: 1080,
  driftSec: 720,
  totalSwitches: 9,
  nudgesReceived: 3,
  appBreakdown: [
    { app: "VS Code", category: "focus", seconds: 1080 },
    { app: "YouTube", category: "distraction", seconds: 480 },
    { app: "Chrome", category: "research", seconds: 240 },
  ],
  insight:
    "82% focus rate — your best rhythm yet. YouTube pulled hardest around minute 12, but you got back within 3 minutes.",
};

export const MOCK_CHAT_HISTORY: ChatMessage[] = [
  {
    role: "ghost",
    content:
      "you've switched away 5 times in 9 minutes. want a short focused sprint to reset?",
    timestamp: Date.now() - 120000,
  },
  {
    role: "user",
    content: "yeah i keep getting stuck on this one function",
    timestamp: Date.now() - 90000,
  },
  {
    role: "ghost",
    content:
      "noticed you're cycling between VS Code and Chrome a lot — classic debugging loop. what's the function supposed to do?",
    timestamp: Date.now() - 60000,
  },
];
```

---

## 🖼️ UI Screens

> **Design is not confirmed.** The Claude design prototype is a WIP reference. Do not treat any specific visual detail as locked until the team confirms it. Screenshots from Claude design and Figma are for reference only.

### Screen 1 — Task Declaration (`declare`)

- Ghost mascot centered, calm state
- Single text input: "what are you working on?"
- Duration pills: 15m / 30m / 45m / 60m + custom input field
- Start button (disabled until task is entered)
- Subtle hint text below start button

### Screen 2 — Active Session (`session`)

- Compact header: task name (truncated) + countdown timer
- Current app row: color-coded dot + app name + category badge
- Three metric chips: switches / focus time / drift time
- Scrollable recent activity feed (last 5 switches, color-coded dots + timestamps)
- Ghost mascot bottom right — reacts to GhostMascotState
- Bottom action bar: chat icon (opens Ghost Chat) + end session button
- **Two-tier nudge system** — see Nudge System section below for full details:
  - Tier 1: In-app nudge bar (inline, softer, appears at bottom of this screen)
  - Tier 2: Popup window (separate BrowserWindow, firmer, for serious drift)

### Screen 3 — Ghost Chat (`chat`)

- Header: ghost avatar + "ghost companion" + live indicator
- Chat feed: scrollable message history, ghost messages left-aligned, user messages right-aligned
- Ghost proactively sends messages based on observed behavior
- Stuck drift automatically opens this screen and ghost initiates
- Inline "stuck mode activated" card when drift type is stuck — single input asking what's snagging them
- Chat input fixed at bottom: "chat with your ghost..."
- Back arrow returns to active session

### Screen 4 — Session Recap (`recap`)

- "session complete" header with task name + duration
- 2×2 metric grid: focus time / drift time / switches / nudges
- Top apps: horizontal time bars for top 3 apps (color coded by category)
- Ghost insight box: AI-generated summary informed by Backboard historical context
- Start new session button (teal, full width)

### Ghost Mascot States

| State       | Trigger             | Visual                          |
| ----------- | ------------------- | ------------------------------- |
| `calm`      | User is focused     | Soft closed eyes, slight smile  |
| `concerned` | Drift detected      | Eyebrows raised, small frown    |
| `thinking`  | Ghost chat open     | Eyes looking up, thought bubble |
| `happy`     | Good session recap  | Wide eyes, upbeat expression    |
| `sleepy`    | Inactivity detected | Droopy eyes, zzz                |

### Design Language

- **Backgrounds:** `#111` (app) and `#1a1a1a` (cards)
- **Accent:** `#2dd4bf` teal — focus states, positive indicators, CTAs
- **Danger:** `#f87171` red — distraction, drift, end session
- **Warning:** `#facc15` amber — research category, mild drift
- **Borders:** 0.5px only, no gradients, no glow effects
- **Fonts:** Inter (UI text), JetBrains Mono (timers, timestamps)
- **Window:** 380px wide, frameless, always-on-top
- **Scrollbars:** `.fg-scroll` class (3px custom scrollbar, defined in `index.css`)

### 🔔 Nudge System

The nudge system has two tiers. The main process decides which tier to use based on drift severity.

**Tier 1 — In-App Nudge (inline, softer)**
Appears as a bar anchored to the bottom of the Active Session window. Used for early or mild drift. Left amber border, 2 lines of text, two buttons. Easy to dismiss, doesn't interrupt flow.

Example: _"you've been on twitter for 3 min. the calc set is still waiting — want a hand?"_
Buttons: `got it` / `i'm stuck`

**Tier 2 — Nudge Popup (separate BrowserWindow, firmer)**
A separate always-on-top window that appears even if the main window is minimized. Used for serious or repeated drift. Six distinct popup types based on context:

| Type                    | Trigger                                   | Tone                                          | Key Buttons                                                                                                              |
| ----------------------- | ----------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `distraction-firm`      | Social media (Twitter, Reddit)            | Firm but not aggressive                       | `1 more min` / `i'm stuck` / `back to work`                                                                              |
| `distraction-hard`      | Games / extreme distraction (Steam, etc.) | Hard interrupt — shows invested time + streak | `end session early` / `back to focus →`                                                                                  |
| `stuck-helpful`         | Stuck drift pattern                       | Helpful, one-tap categories                   | `don't know where to start` / `syntax/error` / `logic isn't clicking` / `just thinking` / `i'm fine` + `chat with ghost` |
| `idle-soft`             | No movement for 4+ minutes                | Gentle, auto-pausing countdown                | `i'm taking a break` / `end session` / `i'm back`                                                                        |
| `pattern-observational` | Same distraction 3+ times in 10 min       | Observational, offers to block                | `just notice it` / `block until [time]`                                                                                  |
| `milestone-positive`    | 25 min no switches (or personal best)     | Celebratory, positive reinforcement           | `nice` / `keep going`                                                                                                    |

**Popup content structure by type:**

`distraction-firm` — ghost avatar + drift duration badge + bold headline referencing the app + 1–2 sentence context + "you were working on" reminder card with timer still counting + action buttons

`distraction-hard` — "hey — eyes on me." headline + context sentence + 3 metric chips: INVESTED / REMAINING / STREAK + action buttons

`stuck-helpful` — checking-in label + "stuck on something?" headline + empathetic 1-sentence body + one-tap category chip grid + `not now` / `chat with ghost` buttons

`idle-soft` — large ghost mascot (sleepy state) + "still there?" headline + body + `i'm taking a break` / `end session` / `i'm back` + auto-pause countdown timer

`pattern-observational` — "PATTERN NOTICED" label + headline stating the pattern (e.g. "third time on twitter in 10 minutes") + mini timeline visualization showing the 3 occurrences + `just notice it` / `block until [time]` buttons

`milestone-positive` — "MILESTONE · 25 MIN" label + "deep focus reached." headline + stat line (zero switches, personal best context from Backboard) + `nice` / `keep going`

**NudgeType union (add to ipc-contract.ts):**

```typescript
export type NudgeType =
  | "distraction-firm"
  | "distraction-hard"
  | "stuck-helpful"
  | "idle-soft"
  | "pattern-observational"
  | "milestone-positive"
  | "in-app"; // tier 1 only

export interface NudgePayload {
  type: NudgeType;
  tier: 1 | 2;
  message: string;
  driftType: DriftType;
  context?: {
    appName?: string; // e.g. "Twitter"
    driftDurationSec?: number;
    investedSec?: number;
    remainingSec?: number;
    streakDays?: number;
    occurrences?: number; // for pattern nudge
    blockUntil?: string; // for pattern nudge offer
  };
}
```

**Decision logic in main process:**

```
Drift event fires
  └── Is it a milestone (25 min no switches)?
      → tier 2 · milestone-positive

  └── Is it inactivity (5+ min no change)?
      → tier 2 · idle-soft

  └── Is it stuck drift?
      → tier 2 · stuck-helpful

  └── Is it the 3rd+ occurrence of same distraction app in 10 min?
      → tier 2 · pattern-observational

  └── Is it a hard distraction (Steam, gaming apps)?
      → tier 2 · distraction-hard

  └── Is it a soft distraction (Twitter, Reddit, YouTube)?
      → first occurrence → tier 1 · in-app
      → repeated         → tier 2 · distraction-firm

```

- **Opacity control** — `BrowserWindow.setOpacity()`, range 0.45–1.0, slider in titlebar or settings
- **Always-on-top toggle** — pin icon in titlebar, `BrowserWindow.setAlwaysOnTop()`
- **Collapsed mode** (stretch) — single horizontal bar: ghost dot + task name + timer + current app + opacity + expand controls. Ghost dot is teal when focused, red/amber when drifting.
- **System tray** (stretch) — app lives in menu bar when fully minimized

---

## 🤖 AI Integration

### Model Selection

```
# Primary — swap via environment variable
GEMINI_MODEL=gemini-2.0-flash     # fast, cheap, good JSON reliability
GEMINI_MODEL=gemma-3-27b-it       # Gemma 4 — targets Best Use of Gemma 4 prize
```

**All AI calls happen in the main process only.** The renderer never touches the Gemini SDK or Backboard API directly.

### Window Category Map

```typescript
const CATEGORY_MAP: Record<string, WindowCategory> = {
  // Focus
  code: "focus", // VS Code
  cursor: "focus",
  webstorm: "focus",
  terminal: "focus",
  iterm: "focus",
  notion: "focus",
  word: "focus",
  docs: "focus",

  // Research
  safari: "research", // treated as research until URL suggests distraction
  chrome: "research", // main process should check window title for YouTube etc.

  // Distraction
  youtube: "distraction",
  discord: "distraction",
  reddit: "distraction",
  tiktok: "distraction",
  twitter: "distraction",
  x: "distraction",
  instagram: "distraction",
  twitch: "distraction",
};
```

### Drift Detection Logic

```
Frequency drift  → 4+ window switches in any 10-minute rolling window
Distraction drift → active window is categorized as 'distraction'
Stuck drift      → 3+ rapid cycles between { focus app ↔ browser ↔ terminal }
                   within a 5-minute window
Inactivity       → no window change for 300 seconds (5 minutes)
```

### Nudge Prompt Template

```
You are a calm, non-judgmental focus companion for a student.
Current task: "${session.task}"
Active app: "${currentApp}" (${category})
Switches in last 10 min: ${recentSwitchCount}
Recent apps: ${recentApps.join(', ')}
Drift type: "${driftType}"
Historical pattern from Backboard: "${backboardContext}"

Generate ONE short nudge (max 2 sentences).
Be specific to context. Ask a question or offer a concrete suggestion.
Never be preachy. Return only the message text — no JSON wrapper.
```

### Ghost Chat Prompt Template

```
You are FocusGhost — a calm, non-judgmental AI focus companion for a student.
You can see their active window and session activity in real time.

Current task: "${session.task}"
Current app: "${currentApp}" (${category})
Session: ${elapsedMin} min elapsed, ${switchCount} switches,
         ${focusMin}m focused, ${driftMin}m drifted
Recent apps: ${recentApps.join(', ')}
Historical patterns from Backboard: "${backboardContext}"
Trigger: "${chatTrigger}"

Previous chat: ${JSON.stringify(chatHistory.slice(-6))}

Respond naturally as a focus companion. Max 2 sentences.
If triggered by stuck drift, ask what's snagging them — one line is enough.
If user replies, respond specifically to what they said.
Observe patterns but never lecture. Return only the message text.
```

### Backboard Integration

- Replaces stateless Gemini calls with persistent cross-session memory
- Every nudge and ghost chat response includes historical context from Backboard
- Backboard stores: session recaps, drift patterns, stuck triggers, task types, focus rhythms
- Memory key: device ID (or Auth0 user ID if Auth0 is implemented)
- Example personalization: _"last 3 sessions you drifted to YouTube after debugging — want to close it before we start?"_

### JSON Safety

All Gemini calls that need structured output must use explicit JSON prompting and wrap parsing in try/catch with a hardcoded fallback:

```typescript
try {
  const parsed = JSON.parse(response.text());
  // use parsed
} catch {
  // use fallback nudge — never crash the app over a bad AI response
  return FALLBACK_NUDGE;
}
```

---

## 🗄️ Data Schema (electron-store)

```typescript
type StoreSchema = {
  currentSession: {
    task: string;
    durationMin: number;
    startTime: number;
    switchLog: Array<{
      app: string;
      category: WindowCategory;
      timestamp: number;
    }>;
    nudgeLog: Array<{
      message: string;
      driftType: DriftType;
      timestamp: number;
    }>;
    chatHistory: ChatMessage[];
  } | null;

  sessionHistory: SessionRecap[]; // fed to Backboard as context

  settings: {
    driftThreshold: number; // switches per 10 min — default 4
    inactivityThreshold: number; // seconds — default 300
    nudgeEnabled: boolean; // default true
    voiceEnabled: boolean; // ElevenLabs — default false
    opacity: number; // 0.45–1.0 — default 1.0
    accentColor: "teal" | "violet" | "amber"; // default 'teal'
    nudgeSensitivity: "gentle" | "balanced" | "strict"; // default 'balanced'
    alwaysOnTop: boolean; // default true
    autoCollapse: boolean; // default false
  };

  userId: string | null; // Auth0 — stretch goal
};
```

---

## 🔄 Development Workflow

### Git Strategy

- `main` — always demo-ready, no direct pushes
- Feature branches: `feature/window-tracking`, `feature/ghost-chat`, etc.
- One person owns merges — reviews PRs, resolves conflicts
- Commit every 30–45 minutes. You will need to roll back at some point.

### Sync Cadence

- Standup every 3 hours: what's done / what's next / blockers. 5 minutes max.
- IPC contract is frozen after first hour. No changes without team discussion.
- If `active-win` integration is blocked, use mock window data so UI and AI work can continue independently.

### Critical Path

```
Person 1 — active-win + drift detection working → by 3pm Saturday
Person 3 — Backboard + Gemini returning real responses → by 5pm Saturday
Person 2 — all 4 screens rendering with mock data → by 4pm Saturday
Person 4 — session data flowing end-to-end → by 9pm Saturday
Everyone — feature freeze → 9am Sunday
```

### Feature Freeze

- No new features after 9am Sunday
- Polish, bug fixes, and demo prep only after freeze

---

## 🎤 Demo Plan

### Physical Setup

- One designated demo machine — test everything on it before the event
- Have VS Code, Chrome (YouTube open in a tab), Discord ready to switch to
- Grant `active-win` accessibility + screen recording permissions before the event
- Prep a pre-loaded session with realistic switch data for the recap demo

### Demo Script (≈ 90 seconds)

1. Open app → declare task: "cybersecurity quiz study" → 30m → start
2. Show VS Code active → teal focus badge
3. Switch to YouTube → red distraction badge appears immediately
4. Nudge overlay fires: _"You switched away from your quiz. Break or distraction?"_
5. Hit "got it" → switch back to VS Code
6. Rapid-cycle VS Code → Chrome → Terminal (simulate stuck drift)
7. Ghost Chat opens automatically → ghost: _"noticed you've been cycling — what's snagging you?"_
8. Type a reply → ghost responds with specific, context-aware suggestion
9. End session → recap: time bars, metrics, ghost insight
10. Key line: _"that insight was personalized — Backboard remembered patterns from previous sessions"_

### Devpost Description Structure

Problem → Solution → How it works → Tech stack → What we learned → What's next

### Backup Plan

- Screen recording of full working demo saved on phone before leaving for the event
- Pre-rendered recap screenshot ready if live session data doesn't accumulate in time
- If `active-win` fails on demo machine: mock mode that simulates window switches on a timer

---

## ⚠️ Known Risks

| Risk                           | Mitigation                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `active-win` macOS permissions | Grant accessibility + screen recording in System Preferences before the event |
| Cross-OS behavior              | One demo machine, all final testing on that OS only                           |
| Backboard API learning curve   | Read docs before the hackathon starts                                         |
| Gemini returns malformed JSON  | try/catch on all parsing, hardcoded fallback nudges always ready              |
| Demo machine build fails       | Use `npm start` (dev mode) as backup — no need to package                     |
| Feature overscope              | Hard freeze 9am Sunday — MVP first, always                                    |
| active-win ESM import          | Use dynamic `import()`, add to Vite externals — see Architecture section      |
