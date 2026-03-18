import { app, BrowserWindow, Menu, Tray, ipcMain, dialog, shell, Notification } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import Store from 'electron-store'
import pkg from 'electron-updater'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const { autoUpdater } = pkg

let mainWindow = null
let authWindow = null
let tray = null
const store = new Store()

// 开发环境下的URL
const isDev = !app.isPackaged
const VITE_DEV_URL = 'http://localhost:5173'

// 开发模式和打包后都设置应用信息
if (process.platform === 'win32') {
  // 开发模式和打包后都使用相同的AppUserModelId
  app.setAppUserModelId('com.ksin.image')
}

// 打包后，从可执行文件所在目录获取图标路径
let iconPath
if (isDev) {
  iconPath = path.join(__dirname, '../build/icon.ico')
} else {
  // 打包后，图标会嵌入在可执行文件中，但托盘等需要文件路径
  iconPath = path.join(process.resourcesPath, 'icon.ico')
  // 如果不存在，尝试其他路径
  if (!existsSync(iconPath)) {
    iconPath = path.join(path.dirname(process.execPath), 'resources', 'icon.ico')
  }
  if (!existsSync(iconPath)) {
    iconPath = path.join(__dirname, '../resources/icon.ico')
  }
}

function createWindow() {
  console.log('Icon path:', iconPath)
  console.log('Icon exists:', existsSync(iconPath))
  console.log('App path:', process.execPath)
  console.log('Resources path:', process.resourcesPath)

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    title: 'Ksin Image',
    icon: iconPath,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
    backgroundColor: '#ffffff'
  })

  // Windows 上强制刷新任务栏图标
  if (process.platform === 'win32') {
    mainWindow.once('show', () => {
      app.setUserTasks([])
      // 触发任务栏刷新
      mainWindow.setOverlayIcon(null, '')
    })
  }

  // 加载应用
  if (isDev) {
    mainWindow.loadURL(VITE_DEV_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../web/index.html'))
  }

  // 窗口关闭行为
  mainWindow.on('close', (event) => {
    const closeBehavior = store.get('settings.closeBehavior', 'minimize')
    if (closeBehavior === 'minimize') {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  // 窗口最小化到托盘
  mainWindow.on('minimize', (event) => {
    const minimizeBehavior = store.get('settings.minimizeBehavior', 'taskbar')
    if (minimizeBehavior === 'tray') {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

function createTray() {
  const trayIcon = iconPath

  tray = new Tray(trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore()
          }
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: '检查更新',
      click: () => {
        autoUpdater.checkForUpdatesAndNotify()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        // 销毁所有窗口
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.destroy()
        }
        if (authWindow && !authWindow.isDestroyed()) {
          authWindow.destroy()
        }
        // 退出应用
        app.quit()
      }
    }
  ])

  tray.setToolTip('Ksin Image')

  try {
    tray.setContextMenu(contextMenu)
  } catch (error) {
    console.error('Error setting tray context menu:', error)
  }

  // 双击托盘图标显示窗口
  tray.on('double-click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
}

// 检查更新
function checkForUpdates() {
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'https://update.ksinx.com/'
  })

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update-message', '正在检查更新...')
  })

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-available', info)
  })

  autoUpdater.on('update-not-available', (info) => {
    mainWindow?.webContents.send('update-message', '当前已是最新版本')
  })

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update-error', err)
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('download-progress', progress)
  })

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-downloaded', info)
  })

  autoUpdater.checkForUpdatesAndNotify()
}

// 创建登录/注册窗口
function createAuthWindow(type = 'login') {
  // 关闭现有窗口
  if (authWindow) {
    authWindow.destroy()
    authWindow = null
  }

  const windowHeight = type === 'login' ? 650 : 800

  authWindow = new BrowserWindow({
    width: 450,
    height: windowHeight,
    frame: false,
    resizable: false,
    title: type === 'login' ? '登录' : '注册',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
    backgroundColor: '#ffffff',
    show: false // 先隐藏，等页面加载完成再显示
  })

  if (isDev) {
    authWindow.loadURL(`${VITE_DEV_URL}#/${type}`)
    authWindow.webContents.openDevTools()
  } else {
    authWindow.loadFile(path.join(__dirname, '../web/index.html'), { hash: `/${type}` })
  }

  // 页面加载完成后显示窗口
  authWindow.once('ready-to-show', () => {
    authWindow.show()
  })

  authWindow.on('closed', () => {
    authWindow = null
  })
}

// IPC 通信处理
ipcMain.handle('window-control', (event, action) => {
  if (!mainWindow) return

  switch (action) {
    case 'minimize':
      mainWindow.minimize()
      break
    case 'maximize':
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
      break
    case 'close':
      mainWindow.close()
      break
    case 'isMaximized':
      return mainWindow.isMaximized()
  }
})

ipcMain.handle('open-auth-window', (event, type) => {
  // 延迟执行，确保现有窗口完全关闭
  setTimeout(() => {
    createAuthWindow(type)
  }, 100)
})

ipcMain.handle('close-auth-window', () => {
  if (authWindow) {
    authWindow.close()
    authWindow = null
  }
})

ipcMain.handle('auth-success', (event, data) => {
  // 通知主窗口刷新用户信息
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('auth-success', data)
  }
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('check-update', () => {
  checkForUpdates()
})

ipcMain.handle('download-update', () => {
  autoUpdater.downloadUpdate()
})

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall()
})

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options)
  return result
})

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options)
  return result
})

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options)
  return result
})

ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url)
})

ipcMain.handle('get-store', (event, key) => {
  return store.get(key)
})

ipcMain.handle('set-store', (event, key, value) => {
  return store.set(key, value)
})

ipcMain.handle('delete-store', (event, key) => {
  return store.delete(key)
})

// 发送通知
ipcMain.handle('show-notification', (event, options) => {
  if (Notification.isSupported()) {
    try {
      const notification = new Notification({
        title: 'Ksin Image - ' + (options.title || ''),
        body: options.body || '',
        icon: iconPath,
        // Windows 上设置 app ID
        ...(process.platform === 'win32' ? { appId: 'com.ksin.image' } : {})
      })
      notification.show()
      return true
    } catch (error) {
      console.error('Error showing notification:', error)
      return false
    }
  }
  return false
})

// App 事件
app.whenReady().then(() => {
  // Windows 开发模式下重新设置应用信息
  if (process.platform === 'win32' && isDev) {
    app.setName('Ksin Image')
  }

  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  mainWindow = null
})
