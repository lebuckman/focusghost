import type { ChatEntry, DriftType } from "../../shared/ipc-contract";
import {
  geminiGenerateChat,
  geminiGenerateInsight,
  geminiGenerateNudge,
  type SessionStateForAI,
} from "./geminiService";

const PLACEHOLDER_BACKBOARD_CONTEXT = "No historical memory available yet.";

export async function generateNudgeMessage(
  session: SessionStateForAI,
  driftType: DriftType,
  backboardContext = PLACEHOLDER_BACKBOARD_CONTEXT,
): Promise<string> {
  return geminiGenerateNudge(session, driftType, backboardContext);
}

export async function generateChatResponse(
  session: SessionStateForAI,
  userMessage: string,
  history: ChatEntry[],
  backboardContext = PLACEHOLDER_BACKBOARD_CONTEXT,
): Promise<string> {
  return geminiGenerateChat(session, userMessage, history, backboardContext);
}

export async function generateInsight(
  session: SessionStateForAI,
  backboardContext = PLACEHOLDER_BACKBOARD_CONTEXT,
): Promise<string> {
  return geminiGenerateInsight(session, backboardContext);
}
