const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mp3ToSrtApi', {
  selectMp3: () => ipcRenderer.invoke('select-mp3'),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  transcribe: (payload) => ipcRenderer.invoke('transcribe', payload),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  onLog: (handler) => {
    const wrapped = (_event, message) => handler(message);
    ipcRenderer.on('transcribe-log', wrapped);
    return () => ipcRenderer.removeListener('transcribe-log', wrapped);
  }
});
