<script lang="ts">
  import { onMount } from "svelte"
  import { fg } from "../lib/store.svelte"
  import { enterScreen } from "../lib/gsap"
  import Ghost from "../components/Ghost.svelte"
  import DriftBar from "../components/DriftBar.svelte"
  import Button from "../components/Button.svelte"
  import { formatHMS, formatMinutes, prettyAppName } from "../lib/format"
  import type { AppUsage, SessionData } from "@shared/types"

  let root: HTMLElement | undefined = $state()

  const session = $derived(fg.lastFinishedSession)

  // Fold intervals → AppUsage[] sorted by total time descending.
  const usage = $derived.by<AppUsage[]>(() => {
    const s = session
    if (!s) return []
    const map = new Map<string, AppUsage>()
    for (const iv of s.intervals) {
      const u = map.get(iv.app) ?? {
        app: iv.app,
        category: iv.category,
        totalMs: 0,
        switchCount: 0,
      }
      u.totalMs += iv.duration
      u.switchCount += 1
      // Promote to non-unknown category if any interval was categorized.
      if (u.category === "unknown" && iv.category !== "unknown") u.category = iv.category
      map.set(iv.app, u)
    }
    return [...map.values()].sort((a, b) => b.totalMs - a.totalMs).slice(0, 5)
  })

  const totalMs = $derived(
    session ? (session.endedAt ?? Date.now()) - session.startedAt - session.pausedMs : 0
  )

  const ghostMood = $derived.by(() => {
    if (!session) return "calm"
    if (session.drift.score < 30) return "happy"
    if (session.drift.score < 65) return "calm"
    return "concerned"
  })

  let reflection = $state("")
  let saving = $state(false)

  onMount(() => enterScreen(root ?? null))

  async function startAnother() {
    await fg.dismissRecap()
  }

  // Reflection is captured but not yet sent to main (Sprint 3 wires the AI
  // recap insight). For now we just dismiss after saving locally.
  async function saveReflection() {
    if (!reflection.trim()) return startAnother()
    saving = true
    try {
      // The session is already persisted by main; reflection is a UX nicety
      // for Sprint 2 and will round-trip through main in Sprint 3.
      await fg.dismissRecap()
    } finally {
      saving = false
    }
  }

  function categoryLabel(s: SessionData): string {
    const total = s.drift.totalActiveMs || 1
    const taskPct = Math.round((s.drift.taskMs / total) * 100)
    return `${taskPct}% on task`
  }
</script>

{#if session}
  <section
    bind:this={root}
    class="flex flex-1 flex-col gap-4 overflow-y-auto px-5 pb-4 pt-3"
  >
    <div class="flex items-start gap-3">
      <Ghost size={48} mood={ghostMood} />
      <div class="min-w-0 flex-1">
        <p class="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Session recap
        </p>
        <p class="line-clamp-2 text-sm font-medium leading-snug">
          {session.taskDescription}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <div class="rounded-[calc(var(--radius)-4px)] bg-foreground/5 px-3 py-2.5">
        <p class="font-mono text-lg tabular-nums">{formatHMS(totalMs)}</p>
        <p class="text-[10px] uppercase tracking-widest text-muted-foreground">total</p>
      </div>
      <div class="rounded-[calc(var(--radius)-4px)] bg-accent/10 px-3 py-2.5">
        <p class="font-mono text-lg tabular-nums text-accent">
          {formatHMS(session.drift.taskMs)}
        </p>
        <p class="text-[10px] uppercase tracking-widest text-muted-foreground">on task</p>
      </div>
      <div class="rounded-[calc(var(--radius)-4px)] bg-destructive/10 px-3 py-2.5">
        <p class="font-mono text-lg tabular-nums text-destructive-foreground">
          {formatHMS(session.drift.driftMs)}
        </p>
        <p class="text-[10px] uppercase tracking-widest text-muted-foreground">drift</p>
      </div>
    </div>

    <DriftBar drift={session.drift} />

    <div>
      <p class="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        Top apps · {categoryLabel(session)}
      </p>
      <ul class="space-y-1">
        {#each usage as u}
          <li
            class="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-foreground/5"
          >
            <span class="flex items-center gap-2 truncate">
              <span
                class="h-1.5 w-1.5 shrink-0 rounded-full {u.category === 'task'
                  ? 'bg-accent'
                  : u.category === 'drift'
                  ? 'bg-destructive'
                  : 'bg-foreground/30'}"
              ></span>
              <span class="truncate">{prettyAppName(u.app)}</span>
            </span>
            <span class="font-mono text-xs text-muted-foreground tabular-nums">
              {formatMinutes(u.totalMs)}
            </span>
          </li>
        {:else}
          <li class="px-2 py-1.5 text-xs text-muted-foreground">
            No app activity recorded.
          </li>
        {/each}
      </ul>
    </div>

    <div>
      <label
        for="reflection"
        class="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
      >
        Quick reflection (optional)
      </label>
      <textarea
        id="reflection"
        bind:value={reflection}
        rows="2"
        placeholder="What worked? What pulled you away?"
        class="w-full resize-none rounded-[calc(var(--radius)-2px)] border border-border bg-input px-3 py-2 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-ring"
      ></textarea>
    </div>

    <div class="mt-auto flex gap-2">
      <Button variant="ghost" full onclick={startAnother}>Done</Button>
      <Button full onclick={saveReflection} disabled={saving}>
        {reflection.trim() ? "Save & start another" : "Start another"}
      </Button>
    </div>
  </section>
{/if}
