import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { saveChatMemory } from './backboardService';
import type {
  ChatEntry,
  DriftType,
  WindowCategory,
} from "../../shared/ipc-contract";

const DEFAULT_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 10000;
const MAX_HISTORY_MESSAGES = 6;
const NO_CONTEXT_TEXT = "No historical context yet.";
const AI_COPY = {
  nudgeTone: "You are a calm, non-judgmental focus companion for a student.",
  chatTone:
    "You are FocusGhost, a calm, non-judgmental AI focus companion for a student.",
  chatToneDetail:
    "You can see their active window and session activity in real time.",
  insightTone: "You are FocusGhost, a calm and supportive study companion.",
  insightFormat:
    "Write a session recap insight in 1-2 sentences, specific and non-judgmental.",
  nudgeFormat: "Generate ONE short nudge (max 2 sentences).",
  nudgeConstraint:
    "Be specific to context. Ask a question or offer a concrete suggestion.",
  noLecture: "Never be preachy. Return only the message text.",
  chatFormat: "Keep replies to 1 to 2 short sentences.",
  chatConstraint: "Sound casual, warm, and direct like a focus buddy.",
  chatReplyConstraint:
    "Do not sound like a therapist, professor, or corporate assistant.",
  chatNoLecture:
    "Return only the message text. No extra labels, no markdown, no emojis.",
  insightConstraint: "Include one concrete suggestion for the next session.",
  insightReturn: "Return only the insight text.",
} as const;

export interface SessionStateForAI {
  task: string;
  durationMin: number;
  startTime: number;
  switchLog: Array<{
    app: string;
    category: WindowCategory;
    timestamp: number;
  }>;
  focusSec: number;
  driftSec: number;
  switchCount: number;
  lastApp?: string;
  lastCategory?: WindowCategory;
}

let modelCache: {
  apiKey: string;
  modelName: string;
  instance: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;
} | null = null;

function getFallbackNudge(driftType: DriftType): string {
  if (driftType === "stuck") {
    return `You look stuck on this step. Want to tell me what is snagging you so we can pick one next action?`;
  }
  if (driftType === "frequency") {
    return `I noticed a lot of app switching in the last few minutes. Want to try a 5-minute focus sprint on just this task?`;
  }
  return `You drifted away from your task for a bit. Want to close distractions and do one focused pass together?`;
}

function getFallbackChat(_task: string): string {
  return "Got you. Let's shrink it to one step. What's the exact thing you're trying to finish right now?";
}

interface TrailAnalysis {
  sequence: string;
  driftPortal: string | null;
  driftChain: string | null;
  focusLoop: string | null;
  recovery: string | null;
}

function analyzeTrail(switchLog: SessionStateForAI['switchLog']): TrailAnalysis {
  // Collapse consecutive duplicate apps
  const collapsed: SessionStateForAI['switchLog'] = [];
  for (const entry of switchLog) {
    if (!collapsed.length || collapsed[collapsed.length - 1].app !== entry.app) {
      collapsed.push(entry);
    }
  }

  const sequence = collapsed.length
    ? collapsed.map(e => e.app).join(' → ')
    : 'none';

  // Drift portal: first focus/research → distraction transition
  let driftPortal: string | null = null;
  for (let i = 0; i < collapsed.length - 1; i++) {
    if (
      (collapsed[i].category === 'focus' || collapsed[i].category === 'research') &&
      collapsed[i + 1].category === 'distraction'
    ) {
      driftPortal = `${collapsed[i].app} → ${collapsed[i + 1].app}`;
      break;
    }
  }

  // Drift chain: 2+ consecutive distraction apps
  let driftChain: string | null = null;
  let chainStart = -1;
  for (let i = 0; i <= collapsed.length; i++) {
    const isDistraction = i < collapsed.length && collapsed[i].category === 'distraction';
    if (isDistraction) {
      if (chainStart === -1) chainStart = i;
    } else if (chainStart !== -1) {
      if (i - chainStart >= 2) {
        driftChain = collapsed.slice(chainStart, i).map(e => e.app).join(' → ');
      }
      chainStart = -1;
    }
  }

  // Focus loop: focus → (research only) → focus productive cycle
  let focusLoop: string | null = null;
  for (let i = 0; i < collapsed.length - 2 && !focusLoop; i++) {
    if (collapsed[i].category === 'focus') {
      for (let j = i + 2; j <= Math.min(i + 3, collapsed.length - 1); j++) {
        if (
          collapsed[j].category === 'focus' &&
          collapsed.slice(i + 1, j).every(e => e.category === 'research')
        ) {
          focusLoop = collapsed.slice(i, j + 1).map(e => e.app).join(' → ');
          break;
        }
      }
    }
  }

  // Recovery: last distraction → focus/research return
  let recovery: string | null = null;
  for (let i = collapsed.length - 2; i >= 0; i--) {
    if (
      collapsed[i].category === 'distraction' &&
      (collapsed[i + 1].category === 'focus' || collapsed[i + 1].category === 'research')
    ) {
      recovery = `${collapsed[i].app} → ${collapsed[i + 1].app}`;
      break;
    }
  }

  return { sequence, driftPortal, driftChain, focusLoop, recovery };
}

function getFallbackInsight(session: SessionStateForAI): string {
  const totalSec = Math.max(1, session.focusSec + session.driftSec);
  const focusPct = Math.round((session.focusSec / totalSec) * 100);
  const trail = analyzeTrail(session.switchLog);
  const portalNote = trail.driftPortal ? ` the drift started at ${trail.driftPortal}.` : '';
  if (focusPct >= 80) {
    return `strong session — ${focusPct}% focused on "${session.task}".${portalNote} keep this same start routine next time.`;
  }
  if (focusPct >= 60) {
    return `solid effort — ${focusPct}% focus on "${session.task}".${portalNote} catching that drift portal earlier next time could make a real difference.`;
  }
  return `tough one at ${focusPct}% focus on "${session.task}".${trail.driftPortal ? ` watch that ${trail.driftPortal} doorway` : ' try closing distracting tabs before you start'} next session.`;
}

function getRecentApps(session: SessionStateForAI, limit = 5): string[] {
  return session.switchLog
    .slice(-limit)
    .map((entry) => entry.app)
    .filter(Boolean);
}

function getCurrentContext(session: SessionStateForAI): {
  app: string;
  category: WindowCategory;
} {
  const lastSwitch = session.switchLog[session.switchLog.length - 1];
  return {
    app: session.lastApp || lastSwitch?.app || "Unknown",
    category: session.lastCategory || lastSwitch?.category || "unknown",
  };
}

function normalizeOutput(text: string): string {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^"+|"+$/g, "")
    .replace(/^'+|'+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  const sentences =
    cleaned
      .match(/[^.!?]+[.!?]?/g)
      ?.map((s) => s.trim())
      .filter(Boolean) || [];
  if (sentences.length <= 2) return cleaned;
  return `${sentences[0]} ${sentences[1]}`.trim();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Gemini request timed out")),
      timeoutMs,
    );
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const modelName = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

  if (!apiKey) return null;

  if (
    modelCache &&
    modelCache.apiKey === apiKey &&
    modelCache.modelName === modelName
  ) {
    return modelCache.instance;
  }

  const client = new GoogleGenerativeAI(apiKey);
  const instance = client.getGenerativeModel({ model: modelName });
  modelCache = { apiKey, modelName, instance };
  return instance;
}

async function generateText(prompt: string): Promise<string> {
  const model = getModel();
  if (!model) return "";

  try {
    const result = await withTimeout(
      model.generateContent(prompt),
      REQUEST_TIMEOUT_MS,
    );
    const responseText = result.response.text() || "";
    return normalizeOutput(responseText);
  } catch {
    return "";
  }
}

function formatContext(backboardContext: string): string {
  return backboardContext || NO_CONTEXT_TEXT;
}

export async function geminiGenerateNudge(
  session: SessionStateForAI,
  driftType: DriftType,
  backboardContext: string,
): Promise<string> {
  const fallback = getFallbackNudge(driftType);
  const current = getCurrentContext(session);
  const recentApps = getRecentApps(session);
  const recentSwitchCount = session.switchLog.filter(
    (entry) => entry.timestamp >= Date.now() - 10 * 60 * 1000,
  ).length;

  const prompt = [
    AI_COPY.nudgeTone,
    `Current task: "${session.task}"`,
    `Active app: "${current.app}" (${current.category})`,
    `Switches in last 10 min: ${recentSwitchCount}`,
    `Recent apps: ${recentApps.join(", ") || "none"}`,
    `Drift type: "${driftType}"`,
    `Historical pattern from Backboard: "${formatContext(backboardContext)}"`,
    AI_COPY.nudgeFormat,
    AI_COPY.nudgeConstraint,
    AI_COPY.noLecture,
  ].join("\n");

  const text = await generateText(prompt);
  return text || fallback;
}

export async function geminiGenerateChat(
  session: SessionStateForAI,
  userMessage: string,
  history: ChatEntry[],
  backboardContext: string,
  deviceId: string,
): Promise<string> {
  const fallback = getFallbackChat(session.task);
  const current = getCurrentContext(session);
  const recentApps = getRecentApps(session);
  const elapsedMin = Math.max(
    0,
    Math.floor((Date.now() - session.startTime) / 60000),
  );
  const focusMin = Math.floor(session.focusSec / 60);
  const driftMin = Math.floor(session.driftSec / 60);
  const compactHistory = history.slice(-MAX_HISTORY_MESSAGES);

  const prompt = [
    AI_COPY.chatTone,
    AI_COPY.chatToneDetail,
    "You are a small desktop ghost companion helping the user keep focus and take the next tiny step.",
    `Current task: "${session.task}"`,
    `Current app: "${current.app}" (${current.category})`,
    `Session: ${elapsedMin} min elapsed, ${session.switchCount} switches, ${focusMin}m focused, ${driftMin}m drifted`,
    `Recent apps: ${recentApps.join(", ") || "none"}`,
    `Historical patterns from Backboard: "${formatContext(backboardContext)}"`,
    `Latest user message: "${userMessage}"`,
    `Previous chat: ${JSON.stringify(compactHistory)}`,
    AI_COPY.chatFormat,
    AI_COPY.chatConstraint,
    AI_COPY.chatReplyConstraint,
    AI_COPY.chatNoLecture,
    "Do not use em dash characters.",
    "Avoid phrases like: 'It sounds like...', 'What aspects of...', 'How are you approaching...', 'Can you elaborate...', 'That sounds like a clear step...'.",
    "Prefer action-oriented responses over broad reflective questions.",
    "Do not shame or scold the user.",
    "Behavior pattern:",
    "- Relevant question: answer directly first, then give one tiny next step.",
    "- Stuck message: acknowledge, then give one concrete next move or ask for one specific missing detail.",
    "- Off-track harmless question: answer briefly, then gently redirect to the current task.",
    "- Clear next step from user: affirm it, then tell them what to do next.",
    "Examples:",
    "Bad: It sounds like finding a title is proving tricky. What aspects are difficult to pin down?",
    "Good: Got you. Send me your topic and main stance, and I'll help turn it into 3 title options.",
    "Bad: How are you approaching that calculation?",
    "Good: Nice, add the numbers first. Once you have the total, divide by how many values there are.",
    "Bad: What will you do with that total once you've added everyone up?",
    "Good: Good. After the total, count how many values you have and divide by that count.",
    "Relevant question example:",
    "User: How do I find the mean?",
    "Good: Add all the numbers, then divide by how many numbers there are. Start by getting the total first.",
    "Off-track question example:",
    "User: What's the best fast food place?",
    "Good: Taco Bell is solid if you want cheap and quick. Tiny redirect though, let's finish this focus step first.",
    "Stuck example:",
    "User: I'm stuck on my speech title.",
    "Good: Got you. Give me the topic and whether you're trying to persuade or inform, and I'll help make a few title options.",
    "Clear next step example:",
    "User: I have to add everyone up.",
    "Good: Yep, that's the right move. Add them carefully, then count how many people are in the list.",
  ].join("\n");

  const text = await generateText(prompt);

  if (text) {
    await saveChatMemory(deviceId, {
      userMessage: userMessage,
      ghostResponse: text,
      sessionTask: session.task,
      timestamp: Date.now(),
    });
  }

  return text || fallback;
}

export async function geminiGenerateInsight(
  session: SessionStateForAI,
  backboardContext: string,
): Promise<string> {
  const fallback = getFallbackInsight(session);
  const totalSec = Math.max(1, session.focusSec + session.driftSec);
  const focusPct = Math.round((session.focusSec / totalSec) * 100);
  const recentApps = getRecentApps(session, 8);
  const trail = analyzeTrail(session.switchLog);

  const prompt = [
    AI_COPY.insightTone,
    `Write a ghost trail insight in exactly 2 short sentences.`,
    `Sentence 1: describe the specific attention pattern visible in the trail — name the actual apps (drift portal, drift chain, focus loop, or recovery moment). Be specific, not generic.`,
    `Sentence 2: give one concrete suggestion informed by the user's historical patterns from Backboard. If no history exists, suggest something based on this session's stats.`,
    `Task: "${session.task}"`,
    `Duration target: ${session.durationMin} min`,
    `Focus rate: ${focusPct}%`,
    `Switches: ${session.switchCount}`,
    `Recent apps: ${recentApps.join(", ") || "none"}`,
    `Attention trail: ${trail.sequence}`,
    `Drift portal (focus→distraction gateway): ${trail.driftPortal ?? "none"}`,
    `Drift chain (consecutive distractions): ${trail.driftChain ?? "none"}`,
    `Focus loop (productive cycle): ${trail.focusLoop ?? "none"}`,
    `Recovery moment (distraction→focus return): ${trail.recovery ?? "none"}`,
    `Historical patterns from Backboard: "${formatContext(backboardContext)}"`,
    `Write in lowercase, casual tone. No preamble, no labels, no markdown. Return only the two sentences.`,
  ].join("\n");

  const text = await generateText(prompt);
  return text || fallback;
}
