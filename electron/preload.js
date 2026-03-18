const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  windowControl: (action) => ipcRenderer.invoke('window-control', action),

  // 登录/注册窗口
  openAuthWindow: (type) => ipcRenderer.invoke('open-auth-window', type),
  closeAuthWindow: () => ipcRenderer.invoke('close-auth-window'),
  authSuccess: (data) => ipcRenderer.invoke('auth-success', data),
  onAuthSuccess: (callback) => ipcRenderer.on('auth-success', (event, data) => callback(data)),

  // 获取应用版本
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // 更新相关
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateMessage: (callback) => ipcRenderer.on('update-message', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateError: (callback) => ipcRenderer.on('update-error', callback),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', callback),

  // 对话框
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),

  // 打开外部链接
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // 本地存储
  getStore: (key) => ipcRenderer.invoke('get-store', key),
  setStore: (key, value) => ipcRenderer.invoke('set-store', key, value),
  deleteStore: (key) => ipcRenderer.invoke('delete-store', key),

  // 通知
  showNotification: (options) => ipcRenderer.invoke('show-notification', options)
})
