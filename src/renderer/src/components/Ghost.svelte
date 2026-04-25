<script lang="ts">
  import { onMount } from "svelte"
  import { bob } from "../lib/gsap"

  type Mood = "calm" | "happy" | "sad" | "concerned" | "thinking"

  interface Props {
    size?: number
    mood?: Mood
    /** Disable the floating idle animation. */
    still?: boolean
  }

  let { size = 96, mood = "calm", still = false }: Props = $props()

  let el: SVGElement | undefined = $state()

  onMount(() => {
    if (still) return
    return bob(el ?? null)
  })

  // Eyes morph to convey mood. We keep this dead simple — circles for happy,
  // tall ovals for concerned, half-moons for sad, etc.
  const eyeShape = $derived.by(() => {
    switch (mood) {
      case "happy":
        return { rx: 3, ry: 1.5, cy: 38, accent: "ring" }
      case "sad":
        return { rx: 3, ry: 3, cy: 40, accent: "down" }
      case "concerned":
        return { rx: 2, ry: 4, cy: 38, accent: "down" }
      case "thinking":
        return { rx: 3, ry: 3, cy: 36, accent: "side" }
      default:
        return { rx: 3, ry: 3, cy: 38, accent: "none" }
    }
  })
</script>

<svg
  bind:this={el}
  width={size}
  height={size}
  viewBox="0 0 80 80"
  fill="none"
  aria-hidden="true"
  class="select-none drop-shadow-[0_8px_24px_oklch(0.78_0.14_75/0.25)]"
>
  <!-- Soft glow halo -->
  <defs>
    <radialGradient id="ghost-glow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.35" />
      <stop offset="60%" stop-color="var(--color-primary)" stop-opacity="0.05" />
      <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="ghost-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="oklch(0.98 0.005 260)" />
      <stop offset="100%" stop-color="oklch(0.88 0.01 260)" />
    </linearGradient>
  </defs>

  <circle cx="40" cy="42" r="36" fill="url(#ghost-glow)" />

  <!-- Body: rounded top + scalloped bottom (the classic ghost silhouette) -->
  <path
    d="M14 38
       C14 22, 26 12, 40 12
       C54 12, 66 22, 66 38
       L66 60
       C66 60, 62 56, 58 60
       C54 64, 50 60, 46 64
       C42 68, 38 60, 34 64
       C30 68, 26 60, 22 64
       C18 60, 14 64, 14 60
       Z"
    fill="url(#ghost-body)"
    stroke="oklch(0.78 0.005 260 / 0.4)"
    stroke-width="0.6"
  />

  <!-- Eyes -->
  <ellipse
    cx="32"
    cy={eyeShape.cy}
    rx={eyeShape.rx}
    ry={eyeShape.ry}
    fill="oklch(0.18 0.02 260)"
  />
  <ellipse
    cx="48"
    cy={eyeShape.cy}
    rx={eyeShape.rx}
    ry={eyeShape.ry}
    fill="oklch(0.18 0.02 260)"
  />

  <!-- Cheek blush only for happy -->
  {#if mood === "happy"}
    <circle cx="26" cy="46" r="2.2" fill="var(--color-primary)" opacity="0.6" />
    <circle cx="54" cy="46" r="2.2" fill="var(--color-primary)" opacity="0.6" />
    <path
      d="M36 48 Q40 52 44 48"
      stroke="oklch(0.18 0.02 260)"
      stroke-width="1.4"
      fill="none"
      stroke-linecap="round"
    />
  {:else if mood === "sad" || mood === "concerned"}
    <path
      d="M36 50 Q40 47 44 50"
      stroke="oklch(0.18 0.02 260)"
      stroke-width="1.4"
      fill="none"
      stroke-linecap="round"
    />
  {:else if mood === "thinking"}
    <line
      x1="36"
      y1="50"
      x2="44"
      y2="50"
      stroke="oklch(0.18 0.02 260)"
      stroke-width="1.4"
      stroke-linecap="round"
    />
  {:else}
    <ellipse cx="40" cy="49.5" rx="2.5" ry="1.2" fill="oklch(0.18 0.02 260)" />
  {/if}
</svg>
