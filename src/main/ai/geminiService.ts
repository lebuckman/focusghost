import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  ChatEntry,
  DriftType,
  WindowCategory,
} from "../../shared/ipc-contract";

const DEFAULT_MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 10000;
const MAX_HISTORY_MESSAGES = 6;

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
    return "You look stuck on this step. Want to tell me what is snagging you so we can pick one next action?";
  }
  if (driftType === "frequency") {
    return "I noticed a lot of app switching in the last few minutes. Want to try a 5-minute focus sprint on just this task?";
  }
  return "You drifted away from your task for a bit. Want to close distractions and do one focused pass together?";
}

function getFallbackChat(task: string): string {
  return `You are still on "${task}". What is the exact blocker right now so we can choose one concrete next step?`;
}

function getFallbackInsight(session: SessionStateForAI): string {
  const totalSec = Math.max(1, session.focusSec + session.driftSec);
  const focusPct = Math.round((session.focusSec / totalSec) * 100);
  if (focusPct >= 80) {
    return `Strong session: ${focusPct}% focused on "${session.task}". Keep this same start routine next time.`;
  }
  if (focusPct >= 60) {
    return `Solid effort: ${focusPct}% focus on "${session.task}". Reducing app switches early could lift the next session.`;
  }
  return `Challenging session at ${focusPct}% focus on "${session.task}". Try one tiny first step before opening extra tabs next time.`;
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
    "You are a calm, non-judgmental focus companion for a student.",
    `Current task: "${session.task}"`,
    `Active app: "${current.app}" (${current.category})`,
    `Switches in last 10 min: ${recentSwitchCount}`,
    `Recent apps: ${recentApps.join(", ") || "none"}`,
    `Drift type: "${driftType}"`,
    `Historical pattern from Backboard: "${backboardContext || "No historical context yet."}"`,
    "Generate ONE short nudge (max 2 sentences).",
    "Be specific to context. Ask a question or offer a concrete suggestion.",
    "Never be preachy. Return only the message text.",
  ].join("\n");

  const text = await generateText(prompt);
  return text || fallback;
}

export async function geminiGenerateChat(
  session: SessionStateForAI,
  userMessage: string,
  history: ChatEntry[],
  backboardContext: string,
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
    "You are FocusGhost, a calm, non-judgmental AI focus companion for a student.",
    "You can see their active window and session activity in real time.",
    `Current task: "${session.task}"`,
    `Current app: "${current.app}" (${current.category})`,
    `Session: ${elapsedMin} min elapsed, ${session.switchCount} switches, ${focusMin}m focused, ${driftMin}m drifted`,
    `Recent apps: ${recentApps.join(", ") || "none"}`,
    `Historical patterns from Backboard: "${backboardContext || "No historical context yet."}"`,
    `Latest user message: "${userMessage}"`,
    `Previous chat: ${JSON.stringify(compactHistory)}`,
    "Respond naturally as a focus companion in max 2 sentences.",
    "If user is stuck, ask what is snagging them in one clear question.",
    "If user replies, respond specifically to what they said.",
    "Observe patterns but never lecture. Return only the message text.",
  ].join("\n");

  const text = await generateText(prompt);
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

  const prompt = [
    "You are FocusGhost, a calm and supportive study companion.",
    "Write a session recap insight in 1-2 sentences, specific and non-judgmental.",
    `Task: "${session.task}"`,
    `Duration target: ${session.durationMin} min`,
    `Focus seconds: ${session.focusSec}`,
    `Drift seconds: ${session.driftSec}`,
    `Switches: ${session.switchCount}`,
    `Focus rate: ${focusPct}%`,
    `Recent apps: ${recentApps.join(", ") || "none"}`,
    `Historical patterns from Backboard: "${backboardContext || "No historical context yet."}"`,
    "Include one concrete suggestion for the next session.",
    "Return only the insight text.",
  ].join("\n");

  const text = await generateText(prompt);
  return text || fallback;
}
