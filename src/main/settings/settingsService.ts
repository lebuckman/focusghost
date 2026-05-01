import type Store from "electron-store";
import type { BrowserWindow } from "electron";
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type AppStore,
} from "../../shared/ipc-contract";

export function loadSettings(store: Store<AppStore>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...(store.get("settings") as Partial<AppSettings> | undefined),
  };
}

export function applySettingsUpdate(
  currentSettings: AppSettings,
  store: Store<AppStore>,
  payload: Partial<AppSettings>,
  mainWindow: BrowserWindow | null,
): AppSettings {
  const nextSettings = { ...currentSettings, ...payload };
  store.set("settings", nextSettings);

  if (mainWindow && "alwaysOnTop" in payload) {
    mainWindow.setAlwaysOnTop(nextSettings.alwaysOnTop);
  }

  return nextSettings;
}

export function getSettingsSnapshot(settings: AppSettings): AppSettings {
  return { ...settings };
}
