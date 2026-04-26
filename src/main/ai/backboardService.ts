/**
 * Backboard Memory Service — Person 2B owns this file
 * 
 * Handles persistent memory across sessions via Backboard API.
 * This service retrieves historical context before AI calls and saves new memory after sessions end.
 * 
 * Uses the official Backboard SDK for AI-powered memory management.
 * DO NOT mix with Gemini SDK code — that lives in geminiService.ts.
 * DO NOT import this directly in main.ts — use aiOrchestrator.ts instead.
 */

import type { SessionRecapPayload } from '../../shared/ipc-contract';
import { BackboardClient } from 'backboard-sdk';

import Store from 'electron-store';
const store = new Store();

/**
 * Represents a single drift event to be saved to memory.
 * Used to build patterns for future session context.
 */
export interface DriftEvent {
  type: 'distraction' | 'stuck' | 'frequency' | 'inactivity';
  app?: string; // e.g. "YouTube", "VS Code"
  timestamp: number;
  sessionTask: string; // what task the user was working on
  recoveryTime?: number; // how long until they returned (seconds)
  userResponded?: 'back_to_work' | 'im_stuck' | 'break' | 'dismissed';
}

/**
 * Backboard service — wraps all Backboard SDK calls.
 * Initialize once on app startup with the API key from .env.
 */
class BackboardService {
  private apiKey: string;
  private client: BackboardClient | null = null;
  private assistantId: string | null = null;
  private threadId: string | null = null;
  private initialized = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.initialized = !!apiKey;
  }

  getAssistantId(): string | null { return this.assistantId; } //MY CODE for debugging

  /**
   * Initialize the Backboard client and create/retrieve assistant + thread.
   * Called once on app startup.
   */
  async init(): Promise<void> {
    if (!this.initialized || this.client) return;

    try {
      this.client = new BackboardClient({ apiKey: this.apiKey });

      // Reuse existing assistant if we've run before, otherwise create a new one
      const existingId = store.get('backboardAssistantId') as string | undefined;

      if (existingId) {
        this.assistantId = existingId;
        console.log('[Backboard] Reusing existing assistant:', this.assistantId);
      } else {
        // Create or retrieve assistant (represents user's memory context)
        // For hackathon MVP, create a new assistant per session
        // Production: could retrieve by deviceId to persist across restarts
        const assistant = await this.client.createAssistant({
          name: 'FocusGhost Memory',
          description: 'Persistent memory of user focus patterns and drift behavior',
        });
        this.assistantId = assistant.assistantId;
        store.set('backboardAssistantId', this.assistantId);
        console.log('[Backboard] Created new assistant:', this.assistantId);
      }

      // Create a thread for this session
      const thread = await this.client.createThread(this.assistantId);
      this.threadId = thread.threadId;

      console.log('[Backboard] Initialized with assistant:', this.assistantId);
    } catch (error) {
      console.error('[Backboard] Initialization failed:', error);
      this.initialized = false;
    }
  }

  /**
   * Retrieve historical context for a given device/user.
   * Returns a clean text summary that Gemini can use in prompts.
   * 
   * @param deviceId - Unique device identifier (not used with SDK yet)
   * @param sessionTask - Current task being worked on (for relevance filtering)
   * @returns Plain text context string summarizing historical patterns
   */
  async getBackboardContext(deviceId: string, sessionTask?: string): Promise<string> {
    if (!this.initialized || !this.client || !this.assistantId) return '';


    try {
      const result = await this.client.getMemories(this.assistantId, { page: 1, pageSize: 50});
      if (!result || !result.memories || result.memories.length === 0) return '';

      const sorted = [...result.memories].sort(
        (a: { createdAt: string }, b: { createdAt: string }) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const context = [
        `User's past session history (${sorted.length} sessions):`,
        ...sorted.map((m: { content: string }) => `- ${m.content}`)
      ].join('\n');

      console.log('[Backboard] Context retrieved:\n', context);
      return context;

    } catch (error) {
      console.error('[Backboard] Error retrieving context:', error);
      return ''; // Fail gracefully — Gemini will work with empty context
    }
  }

  /**
   * Save a completed session to Backboard memory.
   * Called at the end of each session to build long-term patterns.
   * 
   * @param deviceId - Unique device identifier
   * @param recap - Session recap data to persist
   */
  async saveSessionMemory(deviceId: string, recap: SessionRecapPayload): Promise<void> {
    if (!this.initialized || !this.client || !this.assistantId) {
      console.warn('[Backboard] Not initialized; session memory not saved');
      return;
    }

    try {
      // Format session data as a message for Backboard to store
      const totalSec = recap.focusSec + recap.driftSec;
      const focusPct = totalSec > 0 
        ? Math.round((recap.focusSec / totalSec) * 100) 
        : 0;

      const topDriftApp = recap.appBreakdown
        .find(a => a.category === 'distraction')?.app || 'none';

      const content = `Session on task "${recap.task}": ${recap.durationMin} min, ${focusPct}% focus, ${recap.totalSwitches} switches, top distraction: ${topDriftApp}, nudges: ${recap.nudgesReceived}.`;

      // Add to thread with memory enabled
      await this.client.addMemory(this.assistantId, { content });

      console.log('[Backboard] Session memory saved:', {
        task: recap.task,
        focusPct,
        topDriftApp,
        nudgesReceived: recap.nudgesReceived,
      });

    } catch (error) {
      console.error('[Backboard] Error saving session memory:', error);
      // Non-critical: don't crash the app if memory save fails
    }
  }

  /**
   * Save a drift event to Backboard memory.
   * Called whenever a drift is detected to build patterns for future nudges.
   * 
   * @param deviceId - Unique device identifier
   * @param event - The drift event details
   */
  async saveDriftMemory(deviceId: string, event: DriftEvent): Promise<void> {
    if (!this.initialized || !this.client || !this.assistantId) {
      console.warn('[Backboard] Not initialized; drift memory not saved');
      return;
    }

    try {
      const content = `Drift during "${event.sessionTask}": type=${event.type}, app=${event.app || 'unknown'}, recovery=${event.recoveryTime ? `${event.recoveryTime}s` : 'ongoing'}, response=${event.userResponded || 'none'}.`;

      // Add to thread with memory enabled
      await this.client.addMemory(this.assistantId, { content });
 
      console.log('[Backboard] Drift event saved:', {
        type: event.type,
        app: event.app,
      });

    } catch (error) {
      console.error('[Backboard] Error saving drift memory:', error);
      // Non-critical: don't crash the app if memory save fails
    }
  }
}

// Initialize the service (Person 1 or main.ts will call this on app startup)
let backboardService: BackboardService | null = null;

export async function initializeBackboard(apiKey: string): Promise<void> {
  if (backboardService) return;
  backboardService = new BackboardService(apiKey);
  await backboardService.init();
  console.log('[Backboard] Assistant ID:', backboardService?.getAssistantId() ?? 'not set');
}

/**
 * Get the Backboard service instance.
 * Must call initializeBackboard() first.
 */
function getBackboardService(): BackboardService {
  if (!backboardService) {
    throw new Error('Backboard service not initialized. Call initializeBackboard() on app startup.');
  }
  return backboardService;
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported functions — Person 1 calls these via aiOrchestrator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve historical context before an AI call.
 * Used by Gemini prompts to personalize nudges and chat responses.
 */
export async function getBackboardContext(deviceId: string, sessionTask?: string): Promise<string> {
  const service = getBackboardService();
  return service.getBackboardContext(deviceId, sessionTask);
}

/**
 * Save a completed session to memory.
 * Called by Person 1 when endSession() fires.
 */
export async function saveSessionMemory(deviceId: string, recap: SessionRecapPayload): Promise<void> {
  console.log('[Backboard] saveSessionMemory called for task:', recap.task);
  const service = getBackboardService();
  return service.saveSessionMemory(deviceId, recap);
}

/**
 * Save a drift event to memory.
 * Called by Person 1 whenever a drift is detected (frequency, distraction, stuck, inactivity).
 */
export async function saveDriftMemory(deviceId: string, event: DriftEvent): Promise<void> {
  const service = getBackboardService();
  return service.saveDriftMemory(deviceId, event);
}
