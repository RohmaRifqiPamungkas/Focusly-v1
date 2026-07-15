const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  updateTimer: (timeString) => ipcRenderer.send('update-timer', timeString)
})