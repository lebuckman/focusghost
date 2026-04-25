<script lang="ts">
  import type { Snippet } from "svelte"

  type Variant = "primary" | "ghost" | "outline" | "danger"
  type Size = "sm" | "md" | "lg"

  interface Props {
    variant?: Variant
    size?: Size
    type?: "button" | "submit"
    disabled?: boolean
    full?: boolean
    title?: string
    onclick?: (e: MouseEvent) => void
    children?: Snippet
  }

  let {
    variant = "primary",
    size = "md",
    type = "button",
    disabled = false,
    full = false,
    title,
    onclick,
    children,
  }: Props = $props()

  const sizeClasses: Record<Size, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  }

  const variantClasses: Record<Variant, string> = {
    primary:
      "bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.98] shadow-[0_0_24px_-8px_var(--color-primary)]",
    ghost:
      "bg-foreground/5 text-foreground hover:bg-foreground/10 active:scale-[0.98]",
    outline:
      "border border-border text-foreground/80 hover:text-foreground hover:bg-foreground/5",
    danger:
      "bg-destructive/90 text-destructive-foreground hover:bg-destructive active:scale-[0.98]",
  }
</script>

<button
  {type}
  {title}
  {disabled}
  {onclick}
  class="inline-flex items-center justify-center gap-2 rounded-[calc(var(--radius)-4px)] font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none {sizeClasses[
    size
  ]} {variantClasses[variant]} {full ? 'w-full' : ''}"
>
  {@render children?.()}
</button>
