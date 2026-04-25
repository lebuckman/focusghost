# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # run in development (Electron + Vite HMR)
npm run lint       # ESLint over .ts/.tsx files
npm run package    # package app without installer
npm run make       # build distributable installers
```

There is no test suite. The app must be run live to verify UI changes.

## Architecture

FocusGhost is an Electron app (frameless, 380×620, always-on-top) built with React + Vite + Tailwind. The main process uses `active-win` to track the active macOS window and drives a focus-session state machine. It communicates with the renderer exclusively over IPC.

### Process boundary

**`src/shared/ipc-contract.ts`** is the single source of truth for the entire IPC surface — all channel names, payload types, and shared domain types live here. The comment at the top says "DO NOT CHANGE WITHOUT TEAM DISCUSSION." When adding any new IPC channel or shared type, it goes here first.

**`src/main.ts`** — Electron main process entry. Currently minimal; all session logic and `active-win` polling will live here or in `src/main/` modules.

**`src/preload.ts`** — Exposes `window.electronAPI` to the renderer via `contextBridge`. Every IPC call the renderer makes goes through this bridge.

**`src/renderer/electron.d.ts`** — TypeScript declaration for `window.electronAPI` so the renderer gets type safety.

### Renderer screens (state machine in App.tsx)

`App.tsx` owns a `Screen` union (`'declare' | 'session' | 'chat' | 'recap'`) and renders one screen at a time:

| Screen | File | Purpose |
|--------|------|---------|
| `declare` | `TaskDeclaration.tsx` | User types task + picks duration; fires `startSession` IPC |
| `session` | `ActiveSession.tsx` | Live focus dashboard; listens for `sessionUpdate`, `nudge`, `sessionRecap` events |
| `chat` | `GhostChat.tsx` | Chat with the ghost AI companion; sends/receives via `sendChat` / `onChatResponse` |
| `recap` | `SessionRecap.tsx` | Post-session summary with AI insight |

### Key domain concepts

- **WindowCategory** — `'focus' | 'research' | 'distraction' | 'inactive' | 'unknown'` — how the main process classifies each active window.
- **DriftType** — `'frequency' | 'distraction' | 'stuck'` — what kind of attention drift triggered a nudge.
- **GhostMascotState** — `'calm' | 'concerned' | 'thinking' | 'happy' | 'sleepy'` — drives the SVG ghost's animation and eye shape in `GhostMascot.tsx`.
- **NudgeOverlay** — modal overlay on the session screen; dismissed via `dismissNudge` IPC.

### Styling conventions

All component styles are inline `React.CSSProperties` objects — Tailwind is available but UI components use inline styles for fine-grained control. The `.fg-scroll` CSS class in `src/index.css` applies the custom 3px scrollbar to any scrollable container. Accent color is teal (`#2dd4bf`); danger/distraction is red (`#f87171`). Fonts: Inter (UI), JetBrains Mono (timers and timestamps).

### Session engine (`src/main.ts`)

The main process owns all session state. On `START_SESSION` it starts a `setInterval` polling `active-win` every 2 seconds, categorizes each window, accumulates `focusSec`/`driftSec`, and pushes `SESSION_UPDATE` events to the renderer. On `END_SESSION` (or when the timer expires) it builds and sends a `SESSION_RECAP`.

`active-win` is imported via dynamic `import()` (not static) because it is ESM-only. It is also externalized in `vite.main.config.ts` so Vite doesn't attempt to bundle it as CJS. Native modules (`active-win`, `electron-store`) must stay in that external list.

### Mock data

`ipc-contract.ts` exports `MOCK_SESSION_UPDATE`, `MOCK_RECAP`, and `MOCK_CHAT_HISTORY` which are used as initial state in renderer screens during UI development. Remove these once real IPC data flows reliably.

### AI integration

`@google/generative-ai` is installed for the ghost chat and session recap insight generation. This is wired in the main process; the renderer only sends `CHAT_MESSAGE` and receives `CHAT_RESPONSE` / `SESSION_RECAP`.
