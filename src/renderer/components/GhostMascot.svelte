<script lang="ts">
  import type { GhostMascotState } from '../../shared/ipc-contract';

  interface Props {
    state: GhostMascotState;
    size?: number;
  }

  let { state, size = 48 }: Props = $props();

  type VisualState = 'calm' | 'drifting' | 'stuck' | 'happy' | 'sleepy';

  function toVisual(s: GhostMascotState): VisualState {
    if (s === 'concerned') return 'drifting';
    if (s === 'thinking') return 'stuck';
    return s as VisualState;
  }

  const TINT: Record<VisualState, string> = {
    calm: '#5dd8e6',
    drifting: '#7dc8d8',
    stuck: '#6fc4d4',
    happy: '#6fe0d4',
    sleepy: '#6fb8c8',
  };

  const ANIM: Record<VisualState, string> = {
    calm: 'ghostFloat 4s ease-in-out infinite',
    drifting: 'ghostWobble 1.2s ease-in-out infinite',
    stuck: 'ghostThink 2s ease-in-out infinite',
    happy: 'ghostFloat 3s ease-in-out infinite',
    sleepy: 'ghostFloat 5s ease-in-out infinite',
  };

  const EYES: Record<VisualState, { yRatio: number; hRatio: number; wRatio: number; squint: number }> = {
    calm: { yRatio: 0.42, hRatio: 0.08, wRatio: 0.08, squint: 0 },
    drifting: { yRatio: 0.42, hRatio: 0.06, wRatio: 0.10, squint: 0.3 },
    stuck: { yRatio: 0.42, hRatio: 0.10, wRatio: 0.06, squint: 0 },
    happy: { yRatio: 0.42, hRatio: 0.03, wRatio: 0.12, squint: 0.8 },
    sleepy: { yRatio: 0.44, hRatio: 0.02, wRatio: 0.10, squint: 1 },
  };

  let vs = $derived(toVisual(state));
  let w = $derived(size);
  let h = $derived(size * 1.1);
  let eyes = $derived(EYES[vs]);
  let tint = $derived(TINT[vs]);
</script>

<div class="ghost-wrapper" style="width: {w}px; height: {h}px;">
  <svg
    width={w}
    height={h}
    viewBox="0 0 {w} {h}"
    style="filter: drop-shadow(0 0 6px rgba(93,216,230,0.55)) drop-shadow(0 0 12px rgba(93,216,230,0.25)); animation: {ANIM[vs]};"
  >
    <path
      d="M {w * 0.15} {h * 0.5}
         Q {w * 0.15} {h * 0.1}, {w * 0.5} {h * 0.1}
         Q {w * 0.85} {h * 0.1}, {w * 0.85} {h * 0.5}
         L {w * 0.85} {h * 0.85}
         Q {w * 0.78} {h * 0.95}, {w * 0.70} {h * 0.85}
         Q {w * 0.60} {h * 0.75}, {w * 0.50} {h * 0.85}
         Q {w * 0.40} {h * 0.95}, {w * 0.30} {h * 0.85}
         Q {w * 0.22} {h * 0.75}, {w * 0.15} {h * 0.85}
         Z"
      fill={tint}
      opacity="0.95"
    />
    <ellipse
      cx={w * 0.38}
      cy={h * eyes.yRatio}
      rx={w * eyes.wRatio / 2}
      ry={h * eyes.hRatio / 2 * (1 - eyes.squint * 0.9)}
      fill="#111"
    />
    <ellipse
      cx={w * 0.62}
      cy={h * eyes.yRatio}
      rx={w * eyes.wRatio / 2}
      ry={h * eyes.hRatio / 2 * (1 - eyes.squint * 0.9)}
      fill="#111"
    />
    {#if vs === 'drifting'}
      <circle cx={w * 0.28} cy={h * 0.55} r={w * 0.04} fill="#f87171" opacity="0.4" />
      <circle cx={w * 0.72} cy={h * 0.55} r={w * 0.04} fill="#f87171" opacity="0.4" />
    {/if}
    {#if vs === 'stuck'}
      <ellipse cx={w * 0.5} cy={h * 0.58} rx={w * 0.04} ry={h * 0.02} fill="#111" />
    {/if}
    {#if vs === 'happy'}
      <path
        d="M {w * 0.42} {h * 0.56} Q {w * 0.5} {h * 0.62}, {w * 0.58} {h * 0.56}"
        stroke="#111"
        stroke-width="1"
        fill="none"
        stroke-linecap="round"
      />
    {/if}
  </svg>
</div>

<style>
  .ghost-wrapper {
    display: inline-block;
    flex-shrink: 0;
  }
</style>