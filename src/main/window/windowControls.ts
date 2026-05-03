import { ipcMain, type BrowserWindow } from "electron";
import { IPC } from "../../shared/ipc-contract";

export function registerWindowControls(
  getMainWindow: () => BrowserWindow | null,
) {
  ipcMain.on(IPC.WINDOW_CLOSE, () => getMainWindow()?.close());
  ipcMain.on(IPC.WINDOW_MINIMIZE, () => getMainWindow()?.minimize());
  ipcMain.on(IPC.WINDOW_COLLAPSE, () =>
    getMainWindow()?.setSize(380, 80, true),
  );
  ipcMain.on(IPC.WINDOW_EXPAND, () => getMainWindow()?.setSize(380, 620, true));
}
