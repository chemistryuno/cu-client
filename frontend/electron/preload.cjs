const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('__CHEM_RUNTIME_CONFIG', {
  offlineMode: true
})
