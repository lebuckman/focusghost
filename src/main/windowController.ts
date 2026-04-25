import { BrowserWindow, screen } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EventEmitter } from "node:events";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type WindowMode = "anchor" | "panel" | "inlineNudge" | "popupNudge" | "hidden";

interface WindowConfig {
  width: number;
  height: number;
  resizable: boolean;
  frame: boolean;
  transparent: boolean;
  alwaysOnTop: boolean;
  skipTaskbar: boolean;
  focusable: boolean;
}

const ANCHOR_CONFIG: WindowConfig = {
  width: 56,
  height: 56,
  resizable: false,
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  skipTaskbar: true,
  focusable: true,
};

const PANEL_CONFIG: WindowConfig = {
  width: 380,
  height: 620,
  resizable: false,
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  skipTaskbar: true,
  focusable: true,
};

const NUDGE_CONFIG: WindowConfig = {
  width: 320,
  height: 180,
  resizable: false,
  frame: false,
  transparent: true,
  alwaysOnTop: true,
  skipTaskbar: true,
  focusable: true,
};

const devUrl = process.env["ELECTRON_RENDERER_URL"];

function loadWindow(win: BrowserWindow, hash: string): void {
  if (devUrl) {
    win.loadURL(devUrl + hash);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"), { hash });
  }
}

export class WindowController extends EventEmitter {
  private anchorWindow: BrowserWindow | null = null;
  private panelWindow: BrowserWindow | null = null;
  private nudgeWindow: BrowserWindow | null = null;
  private _mode: WindowMode = "hidden";
  private collapseTimer: ReturnType<typeof setTimeout> | null = null;
  private nudgeDismissTimer: ReturnType<typeof setTimeout> | null = null;
  private isPinned = false;
  private anchorOpacity = 0.6;

  get mode(): WindowMode {
    return this._mode;
  }

  get anchor(): BrowserWindow | null {
    return this.anchorWindow;
  }

  get panel(): BrowserWindow | null {
    return this.panelWindow;
  }

  get nudge(): BrowserWindow | null {
    return this.nudgeWindow;
  }

  createAnchor(): BrowserWindow {
    if (this.anchorWindow) return this.anchorWindow;

    const display = screen.getPrimaryDisplay();
    const { workArea } = display;

    this.anchorWindow = new BrowserWindow({
      ...ANCHOR_CONFIG,
      x: workArea.x + workArea.width - ANCHOR_CONFIG.width - 24,
      y: workArea.y + workArea.height - ANCHOR_CONFIG.height - 24,
      backgroundColor: "#00000000",
      webPreferences: {
        preload: path.join(__dirname, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    loadWindow(this.anchorWindow, "#/anchor");
    this.anchorWindow.setOpacity(this.anchorOpacity);
    this.anchorWindow.setIgnoreMouseEvents(true, { forward: true });
    this.anchorWindow.show();
    this._mode = "anchor";

    this.setupAnchorBehavior();
    this.emit("mode-change", this._mode);

    return this.anchorWindow;
  }

  private setupAnchorBehavior(): void {
    if (!this.anchorWindow) return;

    this.anchorWindow.on("mouseEnter", () => {
      this.anchorWindow?.setIgnoreMouseEvents(false);
      this.anchorWindow?.setOpacity(1.0);
    });

    this.anchorWindow.on("mouseLeave", () => {
      if (this._mode === "anchor") {
        this.anchorWindow?.setIgnoreMouseEvents(true, { forward: true });
        this.anchorWindow?.setOpacity(this.anchorOpacity);
      }
    });

    this.anchorWindow.on("blur", () => {
      if (this._mode === "anchor") {
        this.anchorWindow?.setIgnoreMouseEvents(true, { forward: true });
        this.anchorWindow?.setOpacity(this.anchorOpacity);
      }
    });
  }

  expand(): void {
    if (this.panelWindow && !this.panelWindow.isDestroyed()) {
      this.panelWindow.show();
      this.panelWindow.focus();
      this._mode = "panel";
      this.emit("mode-change", this._mode);
      this.setupPanelBlurHandler();
      return;
    }

    if (!this.anchorWindow) return;

    const anchorBounds = this.anchorWindow.getBounds();

    this.panelWindow = new BrowserWindow({
      ...PANEL_CONFIG,
      x: anchorBounds.x - (PANEL_CONFIG.width - ANCHOR_CONFIG.width) / 2,
      y: anchorBounds.y - PANEL_CONFIG.height + ANCHOR_CONFIG.height,
      backgroundColor: "#00000000",
      webPreferences: {
        preload: path.join(__dirname, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    loadWindow(this.panelWindow, "#/panel");
    this.panelWindow.show();
    this.panelWindow.focus();
    this._mode = "panel";
    this.emit("mode-change", this._mode);
    this.setupPanelBlurHandler();
  }

  private setupPanelBlurHandler(): void {
    if (!this.panelWindow) return;

    this.panelWindow.on("blur", () => {
      if (!this.isPinned) {
        this.collapseTimer = setTimeout(() => {
          if (this.panelWindow && !this.panelWindow.isFocused()) {
            this.collapse();
          }
        }, 180);
      }
    });

    this.panelWindow.on("focus", () => {
      if (this.collapseTimer) {
        clearTimeout(this.collapseTimer);
        this.collapseTimer = null;
      }
    });
  }

  collapse(): void {
    if (!this.panelWindow) return;
    this.panelWindow.hide();
    this._mode = "anchor";
    this.emit("mode-change", this._mode);
  }

  showNudge(message: string, urgent = false): void {
    if (this.nudgeWindow && !this.nudgeWindow.isDestroyed()) {
      this.nudgeWindow.webContents.send("nudge:show", { message, urgent });
      this.nudgeWindow.show();
      if (!urgent) this.nudgeWindow.focus();
      this._mode = urgent ? "popupNudge" : "inlineNudge";
      this.emit("mode-change", this._mode);
      this.startNudgeDismissTimer(this.calculateDwellMs(message));
      return;
    }

    const display = screen.getPrimaryDisplay();
    const { workArea } = display;

    this.nudgeWindow = new BrowserWindow({
      ...NUDGE_CONFIG,
      x: workArea.x + workArea.width - NUDGE_CONFIG.width - 24,
      y: workArea.y + 24,
      backgroundColor: "#00000000",
      focusable: true,
      webPreferences: {
        preload: path.join(__dirname, "../preload/index.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    loadWindow(this.nudgeWindow, "#/nudge");
    this._mode = urgent ? "popupNudge" : "inlineNudge";
    this.emit("mode-change", this._mode);

    this.nudgeWindow.once("ready-to-show", () => {
      if (this.nudgeWindow) {
        this.nudgeWindow.webContents.send("nudge:show", { message, urgent });
        this.nudgeWindow.show();
        if (urgent) this.nudgeWindow.showInactive();
        else this.nudgeWindow.focus();
        this.startNudgeDismissTimer(this.calculateDwellMs(message));
      }
    });

    this.nudgeWindow.on("blur", () => {
      if (this.nudgeDismissTimer) {
        clearTimeout(this.nudgeDismissTimer);
        this.nudgeDismissTimer = null;
      }
    });

    this.nudgeWindow.on("click", () => {
      this.interactWithNudge();
    });
  }

  private calculateDwellMs(text: string): number {
    const words = text.trim().split(/\s+/).length;
    return Math.max(2200, Math.min(7000, (words / 220) * 60000));
  }

  private startNudgeDismissTimer(ms: number): void {
    if (this.nudgeDismissTimer) clearTimeout(this.nudgeDismissTimer);
    this.nudgeDismissTimer = setTimeout(() => this.dismissNudge(), ms);
  }

  dismissNudge(): void {
    if (this.nudgeDismissTimer) {
      clearTimeout(this.nudgeDismissTimer);
      this.nudgeDismissTimer = null;
    }
    if (this.nudgeWindow && !this.nudgeWindow.isDestroyed()) {
      this.nudgeWindow.hide();
    }
    this._mode = "anchor";
    this.emit("mode-change", this._mode);
  }

  interactWithNudge(): void {
    if (this.nudgeDismissTimer) {
      clearTimeout(this.nudgeDismissTimer);
      this.nudgeDismissTimer = null;
    }
    if (this.nudgeWindow && !this.nudgeWindow.isDestroyed()) {
      this.nudgeWindow.hide();
    }
    this.expand();
  }

  setPinned(pinned: boolean): void {
    this.isPinned = pinned;
  }

  setOpacity(opacity: number): void {
    this.anchorOpacity = opacity;
    this.anchorWindow?.setOpacity(opacity);
    this.panelWindow?.setOpacity(opacity);
  }

  sendToPanel(channel: string, ...args: unknown[]): void {
    if (this.panelWindow && !this.panelWindow.isDestroyed()) {
      this.panelWindow.webContents.send(channel, ...args);
    }
  }

  sendToAnchor(channel: string, ...args: unknown[]): void {
    if (this.anchorWindow && !this.anchorWindow.isDestroyed()) {
      this.anchorWindow.webContents.send(channel, ...args);
    }
  }

  sendToRenderer(channel: string, ...args: unknown[]): void {
    this.sendToPanel(channel, ...args);
  }

  hideAll(): void {
    this._mode = "hidden";
    this.anchorWindow?.hide();
    this.panelWindow?.hide();
    this.nudgeWindow?.hide();
    this.emit("mode-change", this._mode);
  }

  destroy(): void {
    if (this.collapseTimer) clearTimeout(this.collapseTimer);
    if (this.nudgeDismissTimer) clearTimeout(this.nudgeDismissTimer);
    this.anchorWindow?.destroy();
    this.panelWindow?.destroy();
    this.nudgeWindow?.destroy();
    this.anchorWindow = null;
    this.panelWindow = null;
    this.nudgeWindow = null;
    this._mode = "hidden";
  }
}

export const windowController = new WindowController();