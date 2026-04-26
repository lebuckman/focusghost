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
    return `you look stuck on this step. want to tell me what's snagging you?`;
  }
  if (driftType === "frequency") {
    return `i noticed you switched between apps a few times. want to try a 5-minute focus sprint?`;
  }
  return `you drifted away for a bit... are you ready to jump back in?`;
}

function getFallbackChat(task: string): string {
  return "got you. let's shrink it down. what's one thing you're trying to finish right now?";
}

function getFallbackInsight(session: SessionStateForAI): string {
  const totalSec = Math.max(1, session.focusSec + session.driftSec);
  const focusPct = Math.round((session.focusSec / totalSec) * 100);
  if (focusPct >= 70) {
    return `great session: ${focusPct}% focused on "${session.task}". i'm proud of you for staying on task today. keep up the good work!`;
  }
  if (focusPct >= 60) {
    return `strong session: ${focusPct}% focus on "${session.task}". remember that i'm always here to help! keep up the good work`;
  }
  return `solid effort session at ${focusPct}% focus on "${session.task}". remember that i'm always here to help!`;
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
    `Historical pattern from past sessions (used sparingly to personalize message): "${formatContext(backboardContext)}"`,
    `If the user has shared personal interests in past chats, customize chats to appeal to their interests or personality traits when relevant.`,
    `(e.g. If the user likes sports, you can say "want me to help you get the ball rolling?".)`,
    `If the user reveals their emotional state, provide empathetic encouragement specific to their state of mind.`,
    `(e.g., If the user is working on math homework and shares that they are frustrated, you can say "i know math homework can be frustrating, but i'm here to help!")`,
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
    `Historical patterns from past sessions (use sparingly to personalize responses): "${formatContext(backboardContext)}"`,
    `If the user has shared personal interests in past chats, customize chats to appeal to their interests or personality traits when relevant.`,
    `(e.g. If the user likes sports, and says they're stuck, you can offer to help them get the ball rolling.)`,
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
    "Bad: it sounds like finding a title is proving tricky. what aspects are difficult to pin down?",
    "Good: got you. send me your topic and main stance, and i'll help turn it into 3 title options.",
    "Bad: how are you approaching that calculation?",
    "Good: nice, add the numbers first. once you have the total, divide by how many values there are.",
    "Bad: what will you do with that total once you've added everyone up?",
    "Good: good. after the total, count how many values you have and divide by that count.",
    "Relevant question example:",
    "User: How do I find the mean?",
    "Good: add all the numbers, then divide by how many numbers there are. start by getting the total first.",
    "Off-track question example:",
    "User: what's the best fast food place?",
    "Good: Taco Bell is solid if you want cheap and quick. tiny redirect though, let's finish this focus step first.",
    "Stuck example:",
    "User: I'm stuck on my speech title.",
    "Good: got you. give me the topic and whether you're trying to persuade or inform, and i'll help make a few title options.",
    "Clear next step example:",
    "User: I have to add everyone up.",
    "Good: yep, that's the right move. add them carefully, then count how many people are in the list.",
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

  const prompt = [
    AI_COPY.insightTone,
    AI_COPY.insightFormat,
    `Task: "${session.task}"`,
    `Duration target: ${session.durationMin} min`,
    `Focus seconds: ${session.focusSec}`,
    `Drift seconds: ${session.driftSec}`,
    `Switches: ${session.switchCount}`,
    `Focus rate: ${focusPct}%`,
    `Recent apps: ${recentApps.join(", ") || "none"}`,
    `Historical patterns from past sessions (compare against today if relevant): "${formatContext(backboardContext)}"`,
    `If the user did something well, praise them.`,
    `Use positive language.`,
    AI_COPY.insightConstraint,
    AI_COPY.insightReturn,
  ].join("\n");

  const model = getModel();
  if (!model) return fallback;

  try {
    const result = await withTimeout(
      generateText(prompt),
      6000,
    );
    const text = normalizeOutput(result || "");
    return text;
  } catch {
    return fallback;
  }
}
