import type {
  ChatEntry,
  DriftType,
  SessionRecapPayload,
} from "../../shared/ipc-contract";
import {
  geminiGenerateChat,
  geminiGenerateInsight,
  geminiGenerateNudge,
  type SessionStateForAI,
} from "./geminiService";
import {
  getBackboardContext,
  initializeBackboard,
  saveDriftMemory,
  saveSessionMemory,
  type DriftEvent,
} from "./backboardService";

const DEFAULT_DEVICE_ID = "local-device";
const FALLBACK_BACKBOARD_CONTEXT = "No long-term memory available yet.";

export async function initializeAIOrchestrator(): Promise<void> {
  try {
    await initializeBackboard(process.env.BACKBOARD_API_KEY?.trim() ?? "");
  } catch (error) {
    console.error("[AIOrchestrator] Backboard initialization failed:", error);
  }
}

async function getSafeBackboardContext(
  session: SessionStateForAI,
): Promise<string> {
  try {
    const context = await getBackboardContext(DEFAULT_DEVICE_ID, session.task);
    return context?.trim() ? context : FALLBACK_BACKBOARD_CONTEXT;
  } catch (error) {
    console.error("[AIOrchestrator] Failed to fetch Backboard context:", error);
    return FALLBACK_BACKBOARD_CONTEXT;
  }
}

export async function generateNudgeMessage(
  session: SessionStateForAI,
  driftType: DriftType,
): Promise<string> {
  const backboardContext = await getSafeBackboardContext(session);
  return geminiGenerateNudge(session, driftType, backboardContext);
}

export async function generateChatResponse(
  session: SessionStateForAI,
  userMessage: string,
  history: ChatEntry[],
  deviceId: string,
): Promise<string> {
  const backboardContext = await getSafeBackboardContext(session);
  return geminiGenerateChat(session, userMessage, history, backboardContext, deviceId);
}

export async function generateInsight(
  session: SessionStateForAI,
): Promise<string> {
  const backboardContext = await getSafeBackboardContext(session);
  return geminiGenerateInsight(session, backboardContext);
}

export async function recordSessionMemory(
  recap: SessionRecapPayload,
  chatHistory?: ChatEntry[],
): Promise<void> {
  try {
    const chatMemories = chatHistory?.map(
      (entry) => `${entry.role === 'user' ? 'User' : 'Ghost'} said: "${entry.content}"`
    );
    await saveSessionMemory(DEFAULT_DEVICE_ID, recap, chatMemories);
  } catch (error) {
    console.error("[AIOrchestrator] Error recording session memory:", error);
  }
}

export async function recordDriftMemory(driftEvent: DriftEvent): Promise<void> {
  try {
    await saveDriftMemory(DEFAULT_DEVICE_ID, driftEvent);
  } catch (error) {
    console.error("[AIOrchestrator] Error recording drift memory:", error);
  }
}
