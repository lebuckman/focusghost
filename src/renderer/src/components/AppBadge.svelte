<script lang="ts">
  import type { WindowCategory } from '@shared/ipc-contract';

  interface Props {
    category: WindowCategory;
    app?: string;
  }

  let { category, app: _app }: Props = $props();

  const COLORS: Record<WindowCategory, { dot: string; fg: string; bg: string; label: string }> = {
    focus: { dot: '#2dd4bf', fg: '#2dd4bf', bg: 'rgba(45,212,191,0.10)', label: 'focus' },
    research: { dot: '#60a5fa', fg: '#60a5fa', bg: 'rgba(96,165,250,0.10)', label: 'research' },
    distraction: { dot: '#f87171', fg: '#f87171', bg: 'rgba(248,113,113,0.10)', label: 'distraction' },
    inactive: { dot: '#737373', fg: '#a3a3a3', bg: 'rgba(115,115,115,0.12)', label: 'inactive' },
    unknown: { dot: '#737373', fg: '#a3a3a3', bg: 'rgba(115,115,115,0.12)', label: 'unknown' },
  };

  let c = $derived(COLORS[category] ?? COLORS.unknown);
</script>

<div
  class="badge"
  style="color: {c.fg}; background: {c.bg}; border-color: {c.fg}33;"
>
  {c.label}
</div>

<style>
  .badge {
    font-size: 9px;
    border: 0.5px solid;
    padding: 2px 7px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 500;
    flex-shrink: 0;
  }
</style>