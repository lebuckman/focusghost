<script lang="ts">
  import { settings } from '../stores/app';
  import { updateSettings } from '../lib/electron';
  import type { AppSettings } from '../../shared/ipc-contract';
  import { DEFAULT_SETTINGS } from '../../shared/ipc-contract';

  interface Props {
    onBack: () => void;
  }

  let { onBack }: Props = $props();

  let currentSettings = $state<AppSettings>({ ...DEFAULT_SETTINGS });

  settings.subscribe(s => {
    currentSettings = { ...s };
  });

  function handleOpacityChange(value: number) {
    currentSettings.opacity = value;
    updateSettings({ opacity: value });
  }

  function handleAccentColor(color: 'teal' | 'violet' | 'amber') {
    currentSettings.accentColor = color;
    updateSettings({ accentColor: color });
  }

  function handleNudgeSensitivity(sensitivity: 'gentle' | 'balanced' | 'strict') {
    currentSettings.nudgeSensitivity = sensitivity;
    updateSettings({ nudgeSensitivity: sensitivity });
  }

  function handleToggle(key: 'alwaysOnTop' | 'autoCollapse' | 'nudgeEnabled', value: boolean) {
    currentSettings[key] = value;
    updateSettings({ [key]: value });
  }

  function handleDriftThreshold(value: number) {
    currentSettings.driftThreshold = value;
    updateSettings({ driftThreshold: value });
  }
</script>

<div class="settings-container">
  <div class="settings-header">
    <button class="back-btn" onclick={onBack} aria-label="back">
      ←
    </button>
    <div class="header-title">settings</div>
  </div>

  <div class="settings-body fg-scroll">
    <!-- APPEARANCE SECTION -->
    <div class="settings-section">
      <div class="section-title">appearance</div>

      <div class="setting-row">
        <div class="setting-label">opacity</div>
        <div class="setting-control">
          <input
            type="range"
            min="0.5"
            max="1"
            step="0.1"
            value={currentSettings.opacity}
            onchange={(e) => handleOpacityChange(parseFloat(e.currentTarget.value))}
            class="slider"
          />
          <span class="value-display">{Math.round(currentSettings.opacity * 100)}%</span>
        </div>
      </div>

      <div class="setting-row">
        <div class="setting-label">accent color</div>
        <div class="setting-control">
          <div class="color-picker">
            <button
              class="color-btn"
              class:active={currentSettings.accentColor === 'teal'}
              onclick={() => handleAccentColor('teal')}
              style="background: #2dd4bf"
              title="teal"
            />
            <button
              class="color-btn"
              class:active={currentSettings.accentColor === 'violet'}
              onclick={() => handleAccentColor('violet')}
              style="background: #a78bfa"
              title="violet"
            />
            <button
              class="color-btn"
              class:active={currentSettings.accentColor === 'amber'}
              onclick={() => handleAccentColor('amber')}
              style="background: #fbbf24"
              title="amber"
            />
          </div>
        </div>
      </div>

      <div class="setting-row">
        <div class="setting-label">always on top</div>
        <div class="setting-control">
          <input
            type="checkbox"
            checked={currentSettings.alwaysOnTop}
            onchange={(e) => handleToggle('alwaysOnTop', e.currentTarget.checked)}
            class="toggle"
          />
        </div>
      </div>

      <div class="setting-row">
        <div class="setting-label">auto-collapse</div>
        <div class="setting-control">
          <input
            type="checkbox"
            checked={currentSettings.autoCollapse}
            onchange={(e) => handleToggle('autoCollapse', e.currentTarget.checked)}
            class="toggle"
          />
        </div>
      </div>
    </div>

    <!-- NUDGES SECTION -->
    <div class="settings-section">
      <div class="section-title">nudges</div>

      <div class="setting-row">
        <div class="setting-label">sensitivity</div>
        <div class="setting-control">
          <select
            value={currentSettings.nudgeSensitivity}
            onchange={(e) => handleNudgeSensitivity(e.currentTarget.value as 'gentle' | 'balanced' | 'strict')}
            class="dropdown"
          >
            <option value="gentle">gentle</option>
            <option value="balanced">balanced</option>
            <option value="strict">strict</option>
          </select>
        </div>
      </div>

      <div class="setting-row">
        <div class="setting-label">drift threshold</div>
        <div class="setting-control">
          <input
            type="range"
            min="2"
            max="10"
            step="1"
            value={currentSettings.driftThreshold}
            onchange={(e) => handleDriftThreshold(parseInt(e.currentTarget.value))}
            class="slider"
          />
          <span class="value-display">{currentSettings.driftThreshold}min</span>
        </div>
      </div>

      <div class="setting-row">
        <div class="setting-label">nudges enabled</div>
        <div class="setting-control">
          <input
            type="checkbox"
            checked={currentSettings.nudgeEnabled}
            onchange={(e) => handleToggle('nudgeEnabled', e.currentTarget.checked)}
            class="toggle"
          />
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .settings-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    font-family: 'Inter', sans-serif;
    color: #e5e5e5;
    overflow: hidden;
    background: #111111;
  }

  .settings-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-bottom: 0.5px solid rgba(255, 255, 255, 0.06);
  }

  .back-btn {
    background: transparent;
    border: none;
    color: #737373;
    font-size: 14px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    flex-shrink: 0;
  }

  .header-title {
    font-size: 12px;
    font-weight: 500;
    color: #e5e5e5;
    letter-spacing: -0.01em;
  }

  .settings-body {
    flex: 1;
    overflow-y: auto;
    padding: 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section-title {
    font-size: 10px;
    font-weight: 600;
    color: #737373;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 4px;
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 6px;
    border: 0.5px solid rgba(255, 255, 255, 0.04);
  }

  .setting-label {
    font-size: 11px;
    color: #a3a3a3;
    flex: 1;
  }

  .setting-control {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .slider {
    width: 70px;
    height: 4px;
    border-radius: 2px;
    background: rgba(45, 212, 191, 0.2);
    outline: none;
    -webkit-appearance: none;
    appearance: none;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #2dd4bf;
    cursor: pointer;
  }

  .slider::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #2dd4bf;
    cursor: pointer;
    border: none;
  }

  .value-display {
    font-size: 10px;
    color: #737373;
    font-family: 'JetBrains Mono', monospace;
    min-width: 32px;
    text-align: right;
  }

  .color-picker {
    display: flex;
    gap: 6px;
  }

  .color-btn {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.15s;
  }

  .color-btn.active {
    border-color: #2dd4bf;
    box-shadow: 0 0 8px rgba(45, 212, 191, 0.3);
  }

  .toggle {
    width: 32px;
    height: 18px;
    border-radius: 9px;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    cursor: pointer;
    position: relative;
    appearance: none;
    -webkit-appearance: none;
  }

  .toggle:checked {
    background: #2dd4bf;
  }

  .dropdown {
    background: #1a1a1a;
    border: 0.5px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    color: #e5e5e5;
    font-size: 10px;
    padding: 4px 6px;
    cursor: pointer;
    font-family: inherit;
  }

  .dropdown:hover {
    border-color: rgba(255, 255, 255, 0.15);
  }
</style>
