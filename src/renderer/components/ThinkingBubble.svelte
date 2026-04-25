<script lang="ts">
  import GhostMascot from './GhostMascot.svelte';
</script>

<div class="thinking-bubble-wrap">
  <GhostMascot state="thinking" size={22} />
  <div class="thinking-dots">
    {#each [0, 1, 2] as i}
      <div class="think-dot" style="animation-delay: {i * 0.15}s;"></div>
    {/each}
  </div>
</div>

<style>
  .thinking-bubble-wrap {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .thinking-dots {
    background: #1a1a1a;
    border: 0.5px solid rgba(255,255,255,0.06);
    border-radius: 2px 10px 10px 10px;
    padding: 10px 12px;
    display: flex;
    gap: 3px;
    align-items: center;
  }
  .think-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #2dd4bf;
    animation: thinkDot 1.2s ease-in-out infinite;
  }
</style>