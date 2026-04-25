<script lang="ts">
  import { fg } from "../lib/store.svelte"

  // Opacity slider clamps to a usable range so the user can never make the
  // window completely invisible by accident.
  const MIN_OP = 0.4
  const MAX_OP = 1.0

  let opacity = $derived(fg.settings?.windowOpacity ?? 1)

  function onOpacity(e: Event) {
    const v = Number((e.target as HTMLInputElement).value)
    fg.setOpacity(v)
  }

  function close() {
    // Renderer can't close the window directly; just collapse + hide chat.
    // A future Settings menu can offer "Quit" via an IPC call.
    fg.setCollapsed(true)
  }
</script>

<header
  class="app-drag flex h-9 items-center justify-between gap-2 border-b border-border/60 px-3"
>
  <div class="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
    <span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
    FocusGhost
  </div>

  <div class="no-drag flex items-center gap-2">
    <label class="flex items-center gap-1.5" title="Window opacity">
      <span class="text-[10px] uppercase tracking-widest text-muted-foreground">opacity</span>
      <input
        type="range"
        min={MIN_OP}
        max={MAX_OP}
        step="0.05"
        value={opacity}
        oninput={onOpacity}
        class="h-1 w-20 cursor-pointer appearance-none rounded-full bg-foreground/15 accent-primary"
      />
    </label>

    <button
      type="button"
      onclick={() => fg.setCollapsed(true)}
      title="Collapse to bar"
      aria-label="Collapse to bar"
      class="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M2 6h8"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    </button>

    <button
      type="button"
      onclick={close}
      title="Hide"
      aria-label="Hide"
      class="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-destructive/20 hover:text-destructive-foreground"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path
          d="M3 3l6 6M9 3l-6 6"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    </button>
  </div>
</header>
