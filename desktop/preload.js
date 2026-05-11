const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pulseDesktop", {
  platform: process.platform,
  version: process.env.npm_package_version || "1.0.0",
  onNotification: (callback) => ipcRenderer.on("notification", (_event, data) => callback(data)),
  removeNotificationListener: () => ipcRenderer.removeAllListeners("notification"),
});
