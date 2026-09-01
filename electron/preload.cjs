const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronRuntime', {
  isStandalone: true,
});
