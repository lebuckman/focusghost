<script lang="ts">
  import { formatHMS } from "../lib/format"

  interface Props {
    elapsedMs: number
    plannedMinutes: number | null
    state: "active" | "paused" | "stuck"
  }

  let { elapsedMs, plannedMinutes, state }: Props = $props()

  const plannedMs = $derived((plannedMinutes ?? 0) * 60_000)
  const progress = $derived(
    plannedMs > 0 ? Math.min(1, elapsedMs / plannedMs) : 0
  )

  // SVG ring math: r=58 → C ≈ 364.42
  const C = 2 * Math.PI * 58
  const dashOffset = $derived(C * (1 - progress))

  const ringColor = $derived.by(() => {
    if (state === "stuck") return "var(--color-destructive)"
    if (state === "paused") return "oklch(0.72 0.01 260)"
    return "var(--color-primary)"
  })
</script>

<div class="relative flex h-36 w-36 items-center justify-center">
  {#if plannedMinutes && plannedMinutes > 0}
    <svg viewBox="0 0 128 128" class="absolute inset-0 -rotate-90">
      <circle
        cx="64"
        cy="64"
        r="58"
        stroke="var(--color-border)"
        stroke-width="3"
        fill="none"
      />
      <circle
        cx="64"
        cy="64"
        r="58"
        stroke={ringColor}
        stroke-width="3"
        fill="none"
        stroke-linecap="round"
        stroke-dasharray={C}
        stroke-dashoffset={dashOffset}
        style="transition: stroke-dashoffset 1s linear, stroke 0.3s ease;"
      />
    </svg>
  {/if}

  <div class="flex flex-col items-center">
    <span
      class="font-mono text-3xl font-medium tabular-nums tracking-tight"
      class:text-muted-foreground={state === "paused"}
    >
      {formatHMS(elapsedMs)}
    </span>
    {#if plannedMinutes}
      <span class="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        of {plannedMinutes}m
      </span>
    {:else}
      <span class="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        open session
      </span>
    {/if}
  </div>
</div>
