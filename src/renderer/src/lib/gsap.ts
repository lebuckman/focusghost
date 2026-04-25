// Thin GSAP wrappers. We import gsap eagerly here because the timeline is
// shared across screens; the bundle cost is small and predictable.
import { gsap } from "gsap"

/** Soft fade + lift used when a screen mounts. */
export function enterScreen(el: Element | null): void {
  if (!el) return
  gsap.fromTo(
    el,
    { opacity: 0, y: 8, filter: "blur(4px)" },
    { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.32, ease: "power2.out" }
  )
}

/** Bouncy attention pulse used for nudge banners. */
export function pulse(el: Element | null): void {
  if (!el) return
  gsap.fromTo(
    el,
    { scale: 0.96, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.42, ease: "back.out(1.8)" }
  )
}

/** Continuous gentle bob — used by the Ghost mascot. Returns a kill fn. */
export function bob(el: Element | null): () => void {
  if (!el) return () => {}
  const tween = gsap.to(el, {
    y: -6,
    duration: 2.4,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut",
  })
  return () => tween.kill()
}

export { gsap }
