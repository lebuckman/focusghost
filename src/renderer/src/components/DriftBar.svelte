<script lang="ts">
  import type { DriftSnapshot } from "@shared/types"
  import { formatMinutes } from "../lib/format"

  interface Props {
    drift: DriftSnapshot
    compact?: boolean
  }

  let { drift, compact = false }: Props = $props()

  // Stacked widths sum to 100% of totalActiveMs. Math.max guards a div-by-0.
  const total = $derived(Math.max(1, drift.totalActiveMs))
  const taskPct = $derived((drift.taskMs / total) * 100)
  const contextPct = $derived((drift.contextMs / total) * 100)
  const driftPct = $derived((drift.driftMs / total) * 100)

  const moodLabel = $derived.by(() => {
    if (drift.score < 30) return "On track"
    if (drift.score < 65) return "Wobbly"
    return "Drifting"
  })
  const moodColor = $derived.by(() => {
    if (drift.score < 30) return "text-accent"
    if (drift.score < 65) return "text-primary"
    return "text-destructive"
  })
</script>

<div class="space-y-1.5">
  {#if !compact}
    <div class="flex items-baseline justify-between text-xs">
      <span class="text-muted-foreground">Focus</span>
      <span class={moodColor + " font-medium tabular-nums"}>
        {moodLabel} · {Math.round(drift.score)}
      </span>
    </div>
  {/if}

  <div
    class="relative flex h-2 overflow-hidden rounded-full bg-foreground/5 ring-1 ring-inset ring-border"
    aria-label="Time distribution: task, context, drift"
  >
    <div
      class="h-full bg-accent transition-[width] duration-500 ease-out"
      style="width: {taskPct}%"
    ></div>
    <div
      class="h-full bg-foreground/25 transition-[width] duration-500 ease-out"
      style="width: {contextPct}%"
    ></div>
    <div
      class="h-full bg-destructive transition-[width] duration-500 ease-out"
      style="width: {driftPct}%"
    ></div>
  </div>

  {#if !compact}
    <div class="flex items-center gap-3 text-[11px] text-muted-foreground">
      <span class="inline-flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full bg-accent"></span>
        Task {formatMinutes(drift.taskMs)}
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full bg-foreground/30"></span>
        Context {formatMinutes(drift.contextMs)}
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full bg-destructive"></span>
        Drift {formatMinutes(drift.driftMs)}
      </span>
    </div>
  {/if}
</div>
