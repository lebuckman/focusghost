<script lang="ts">
  import type { AppCategory } from "@shared/types"
  import { prettyAppName } from "../lib/format"

  interface Props {
    app: string | null | undefined
    title?: string | null
    category?: AppCategory | null
  }

  let { app, title, category }: Props = $props()

  const dotColor: Record<AppCategory, string> = {
    task: "bg-accent",
    context: "bg-foreground/40",
    drift: "bg-destructive",
    neutral: "bg-foreground/20",
    unknown: "bg-foreground/20",
  }
  const dot = $derived(category ? dotColor[category] : "bg-foreground/20")
</script>

<div
  class="inline-flex max-w-full items-center gap-2 rounded-full bg-foreground/5 px-3 py-1.5 ring-1 ring-inset ring-border"
>
  <span class="h-1.5 w-1.5 shrink-0 rounded-full {dot}"></span>
  <span class="truncate text-sm font-medium text-foreground">
    {app ? prettyAppName(app) : "No app"}
  </span>
  {#if title}
    <span class="truncate text-xs text-muted-foreground">— {title}</span>
  {/if}
</div>
