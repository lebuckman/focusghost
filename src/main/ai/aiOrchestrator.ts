/**
 * AI Orchestrator — Shared by Person 2A + Person 2B
 * 
 * This thin layer orchestrates calls to Gemini (Person 2A) and Backboard (Person 2B).
 * Person 1 imports ONLY from this file, never directly from geminiService or backboardService.
 * 
 * Workflow:
 * 1. Person 1 calls generateNudgeMessage()
 * 2. This function calls getBackboardContext() from Person 2B
 * 3. Passes the context to geminiGenerateNudge() from Person 2A
 * 4. Returns the AI-generated message to Person 1
 */

import type { SessionRecapPayload, DriftType, ChatEntry } from '../../shared/ipc-contract';
import type { DriftEvent } from './backboardService';

// Import from Person 2B's Backboard service
import { getBackboardContext, saveSessionMemory, saveDriftMemory } from './backboardService';

// TODO: Person 2A will create geminiService.ts and export these functions
// For now, these are placeholders that Person 1 can call
async function geminiGenerateNudge(
  task: string,
  currentApp: string,
  category: string,
  driftType: DriftType,
  backboardContext: string
): Promise<string> {
  // Placeholder — Person 2A replaces this with actual Gemini call
  return `You've drifted to ${currentApp}. Stay focused on "${task}" — you've got this!`;
}

async function geminiGenerateChat(
  task: string,
  currentApp: string,
  userMessage: string,
  chatHistory: ChatEntry[],
  backboardContext: string
): Promise<string> {
  // Placeholder — Person 2A replaces this with actual Gemini call
  return `I hear you. Let's get back to "${task}". What's blocking you right now?`;
}

async function geminiGenerateInsight(
  task: string,
  focusSec: number,
  driftSec: number,
  switchCount: number,
  topDriftApp: string | undefined,
  backboardContext: string
): Promise<string> {
  // Placeholder — Person 2A replaces this with actual Gemini call
  const totalSec = focusSec + driftSec;
  const focusPct = Math.round((focusSec / totalSec) * 100);
  return `Session complete! You stayed focused ${focusPct}% of the time on "${task}". Keep that momentum going.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported orchestrator functions — Person 1 calls ONLY these
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a personalized nudge message.
 * 
 * Called by Person 1 when drift is detected.
 * Combines Backboard historical context with Gemini response generation.
 */
export async function generateNudgeMessage(
  deviceId: string,
  task: string,
  currentApp: string,
  category: string,
  driftType: DriftType
): Promise<string> {
  try {
    // Step 1: Retrieve historical context from Backboard (Person 2B)
    const backboardContext = await getBackboardContext(deviceId, task);

    // Step 2: Generate personalized nudge via Gemini (Person 2A)
    const message = await geminiGenerateNudge(
      task,
      currentApp,
      category,
      driftType,
      backboardContext
    );

    return message;
  } catch (error) {
    console.error('[AIOrchestrator] Error generating nudge:', error);
    return `You've switched away from "${task}". Get back on track!`; // Fallback
  }
}

/**
 * Generate a personalized chat response.
 * 
 * Called by Person 1 when the user sends a message in Ghost Chat.
 * Combines Backboard context with Gemini response generation.
 */
export async function generateChatResponse(
  deviceId: string,
  task: string,
  currentApp: string,
  userMessage: string,
  chatHistory: ChatEntry[]
): Promise<string> {
  try {
    // Step 1: Retrieve historical context from Backboard (Person 2B)
    const backboardContext = await getBackboardContext(deviceId, task);

    // Step 2: Generate personalized response via Gemini (Person 2A)
    const message = await geminiGenerateChat(
      task,
      currentApp,
      userMessage,
      chatHistory,
      backboardContext
    );

    return message;
  } catch (error) {
    console.error('[AIOrchestrator] Error generating chat response:', error);
    return `I'm here to help you stay focused. What's blocking you?`; // Fallback
  }
}

/**
 * Generate a session recap insight.
 * 
 * Called by Person 1 when the session ends.
 * Combines Backboard context with Gemini response generation.
 */
export async function generateInsight(
  deviceId: string,
  recap: SessionRecapPayload
): Promise<string> {
  try {
    // Step 1: Retrieve historical context from Backboard (Person 2B)
    const backboardContext = await getBackboardContext(deviceId, recap.task);

    // Step 2: Generate personalized insight via Gemini (Person 2A)
    const topDriftApp = recap.appBreakdown.find(a => a.category === 'distraction')?.app;
    const message = await geminiGenerateInsight(
      recap.task,
      recap.focusSec,
      recap.driftSec,
      recap.totalSwitches,
      topDriftApp,
      backboardContext
    );

    return message;
  } catch (error) {
    console.error('[AIOrchestrator] Error generating insight:', error);
    return recap.insight; // Fall back to the hardcoded insight from buildRecap()
  }
}

/**
 * Save a completed session to memory.
 * 
 * Called by Person 1 when endSession() is triggered.
 */
export async function recordSessionMemory(
  deviceId: string,
  recap: SessionRecapPayload
): Promise<void> {
  try {
    await saveSessionMemory(deviceId, recap);
  } catch (error) {
    console.error('[AIOrchestrator] Error recording session memory:', error);
    // Non-critical: don't crash the app over memory save
  }
}

/**
 * Save a drift event to memory.
 * 
 * Called by Person 1 whenever drift is detected (frequency, distraction, stuck, inactivity).
 */
export async function recordDriftMemory(
  deviceId: string,
  event: DriftEvent
): Promise<void> {
  try {
    await saveDriftMemory(deviceId, event);
  } catch (error) {
    console.error('[AIOrchestrator] Error recording drift memory:', error);
    // Non-critical: don't crash the app over memory save
  }
}
