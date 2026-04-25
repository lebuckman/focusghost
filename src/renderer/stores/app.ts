import { writable, derived, type Writable, type Readable } from 'svelte/store';
import type { SessionUpdate, SessionRecapPayload, ChatEntry, NudgePayload, GhostMascotState } from '../../shared/ipc-contract';
import { MOCK_SESSION_UPDATE, MOCK_RECAP, MOCK_CHAT_HISTORY } from '../../shared/ipc-contract';

export type Screen = 'declare' | 'session' | 'chat' | 'recap';

export const screen: Writable<Screen> = writable('declare');
export const recap: Writable<SessionRecapPayload | null> = writable(null);
export const activeTask: Writable<string> = writable('');
export const activeMins: Writable<number> = writable(30);

export const sessionUpdate: Writable<SessionUpdate> = writable(MOCK_SESSION_UPDATE);
export const nudge: Writable<NudgePayload | null> = writable(null);
export const chatHistory: Writable<ChatEntry[]> = writable(MOCK_CHAT_HISTORY);
export const isThinking: Writable<boolean> = writable(false);

export function goToSession(task: string, durationMin: number): void {
  activeTask.set(task);
  activeMins.set(durationMin);
  screen.set('session');
}

export function goToChat(): void {
  screen.set('chat');
}

export function goToRecap(data: SessionRecapPayload): void {
  recap.set(data);
  screen.set('recap');
}

export function goToDeclare(): void {
  recap.set(null);
  screen.set('declare');
}

export function resetSessionState(): void {
  sessionUpdate.set(MOCK_SESSION_UPDATE);
  nudge.set(null);
  chatHistory.set(MOCK_CHAT_HISTORY);
  isThinking.set(false);
}