const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  generatePDF: (htmlContent, filename) =>
    ipcRenderer.send('generate-pdf', { htmlContent, filename })
});
