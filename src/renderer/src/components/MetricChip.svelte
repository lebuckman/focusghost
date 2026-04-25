<script lang="ts">
  interface Props {
    label: string;
    value: string | number;
    color?: 'teal' | 'red' | 'amber';
  }

  let { label, value, color }: Props = $props();

  const VALUE_COLOR: Record<string, string> = {
    teal: '#2dd4bf',
    red: '#f87171',
    amber: '#facc15',
  };

  let valueColor = $derived(color ? VALUE_COLOR[color] : '#e5e5e5');
</script>

<div class="chip">
  <div class="label">{label}</div>
  <div class="value" style="color: {valueColor};">{value}</div>
</div>

<style>
  .chip {
    background: #1a1a1a;
    border: 0.5px solid rgba(255,255,255,0.06);
    border-radius: 5px;
    padding: 8px 9px;
  }
  .label {
    font-size: 9px;
    color: #737373;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 3px;
  }
  .value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
</style>