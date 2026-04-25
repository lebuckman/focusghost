<script lang="ts">
  import { onMount } from "svelte";
  import {
    screen,
    recap,
    activeTask,
    activeMins,
    goToSession,
    goToRecap,
    goToChat,
    resetSessionState,
    goToDeclare,
  } from "./stores/app";
  import {
    onSessionUpdate,
    onOpenGhostChat,
    onSessionRecap,
    onNudge,
    cleanupAllListeners,
  } from "./lib/electron";
  import type { SessionRecapPayload, SessionUpdate, NudgePayload } from "@shared/ipc-contract";
  import TaskDeclaration from "./screens/TaskDeclaration.svelte";
  import ActiveSession from "./screens/ActiveSession.svelte";
  import GhostChat from "./screens/GhostChat.svelte";
  import SessionRecap from "./screens/SessionRecap.svelte";

  let currentScreen = $state("declare");
  let currentRecap = $state<SessionRecapPayload | null>(null);
  let currentTask = $state("");
  let currentMins = $state(30);

  screen.subscribe((s) => (currentScreen = s));
  recap.subscribe((r) => (currentRecap = r));
  activeTask.subscribe((t) => (currentTask = t));
  activeMins.subscribe((m) => (currentMins = m));

  onMount(() => {
    onSessionUpdate((_data: SessionUpdate) => {
      // handled in ActiveSession
    });
    onOpenGhostChat(() => {
      goToChat();
    });
    onSessionRecap((data: SessionRecapPayload) => {
      goToRecap(data);
    });
    onNudge((_data: NudgePayload) => {
      // handled in ActiveSession
    });

    return () => {
      cleanupAllListeners();
    };
  });

  function handleStart(task: string, durationMin: number) {
    goToSession(task, durationMin);
  }

  function handleOpenChat() {
    goToChat();
  }

  function handleRecap(data: SessionRecapPayload) {
    goToRecap(data);
  }

  function handleNewSession() {
    resetSessionState();
    goToDeclare();
  }

  function handleChatBack() {
    screen.set("session");
  }
</script>

<div class="app-container">
  {#if currentScreen === "declare"}
    <TaskDeclaration onStart={handleStart} />
  {:else if currentScreen === "session"}
    <ActiveSession
      task={currentTask}
      durationMin={currentMins}
      onOpenChat={handleOpenChat}
      onRecap={handleRecap}
    />
  {:else if currentScreen === "chat"}
    <GhostChat onBack={handleChatBack} />
  {:else if currentScreen === "recap" && currentRecap}
    <SessionRecap recap={currentRecap} onNewSession={handleNewSession} />
  {/if}
</div>

<style>
  .app-container {
    width: 100%;
    height: 100vh;
    overflow: hidden;
    background: #111111;
    font-family: "Inter", sans-serif;
  }
</style>