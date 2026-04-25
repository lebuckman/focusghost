<script lang="ts">
  import { fg } from "../lib/store.svelte"
  import Ghost from "../components/Ghost.svelte"
  import DriftBar from "../components/DriftBar.svelte"
  import { formatHMS } from "../lib/format"

  const session = $derived(fg.session)

  // The collapsed bar is a single horizontal row. The whole bar is draggable
  // (it's the window handle) except the expand button.
</script>

<section
  class="app-drag flex h-full items-center gap-3 px-3"
  aria-label="FocusGhost collapsed bar"
>
  <Ghost size={32} mood={fg.driftLevel === "drifting" ? "concerned" : "calm"} still />

  {#if session}
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <div class="flex items-center justify-between gap-2">
        <span class="truncate text-xs font-medium text-foreground">
          {session.taskDescription}
        </span>
        <span class="font-mono text-xs tabular-nums text-muted-foreground">
          {formatHMS(fg.elapsedMs)}
        </span>
      </div>
      <DriftBar drift={fg.drift} compact />
    </div>
  {:else}
    <div class="flex-1 text-xs text-muted-foreground">No active session</div>
  {/if}

  <button
    type="button"
    onclick={() => fg.setCollapsed(false)}
    title="Expand"
    aria-label="Expand"
    class="no-drag grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
  >
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M3 5l3-3 3 3M3 7l3 3 3-3"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</section>
