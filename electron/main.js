import { app, BrowserWindow, Menu, Tray, ipcMain, dialog, shell, Notification } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import os from 'os'
import Store from 'electron-store'
import pkg from 'electron-updater'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const { autoUpdater } = pkg

let mainWindow = null
let authWindow = null
let payWindow = null
let viewerWindow = null
let updateWindow = null
let tray = null
let isQuitting = false
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
    backgroundColor: '#ffffff',
    show: false
  })

  // 页面加载完成后显示窗口，避免闪屏
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
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
    if (isQuitting) return
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
        checkForUpdates()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        // 销毁所有窗口
        if (viewerWindow && !viewerWindow.isDestroyed()) {
          viewerWindow.destroy()
        }
        if (payWindow && !payWindow.isDestroyed()) {
          payWindow.destroy()
        }
        if (authWindow && !authWindow.isDestroyed()) {
          authWindow.destroy()
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.destroy()
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

  // 点击托盘图标显示窗口
  tray.on('click', () => {
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
  // 开发模式下强制检查更新
  if (!app.isPackaged) {
    autoUpdater.forceDevDownloadConfig = true
  }
  
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

// 创建支付窗口
function createPayWindow(planId, priceId) {
  if (payWindow) {
    payWindow.destroy()
    payWindow = null
  }

  payWindow = new BrowserWindow({
    width: 520,
    height: 680,
    frame: false,
    resizable: false,
    title: '购买套餐',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
    backgroundColor: '#ffffff',
    show: false,
    parent: mainWindow
  })

  const payUrl = `plan=${planId}&price=${priceId}`
  if (isDev) {
    payWindow.loadURL(`${VITE_DEV_URL}#/pay?${payUrl}`)
  } else {
    payWindow.loadFile(path.join(__dirname, '../web/index.html'), { hash: `/pay?${payUrl}` })
  }

  payWindow.once('ready-to-show', () => {
    payWindow.show()
  })

  payWindow.on('closed', () => {
    // 支付窗口关闭时通知主窗口刷新数据
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pay-success')
    }
    payWindow = null
  })
}

// 创建更新窗口
function createUpdateWindow() {
  if (updateWindow && !updateWindow.isDestroyed()) {
    updateWindow.focus()
    return
  }

  updateWindow = new BrowserWindow({
    width: 450,
    height: 400,
    frame: false,
    resizable: false,
    title: '检查更新',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
    backgroundColor: '#ffffff',
    show: false,
    parent: mainWindow,
    modal: true
  })

  if (isDev) {
    updateWindow.loadURL(`${VITE_DEV_URL}#/update`)
  } else {
    updateWindow.loadFile(path.join(__dirname, '../web/index.html'), { hash: '/update' })
  }

  updateWindow.once('ready-to-show', () => {
    updateWindow.show()
  })

  updateWindow.on('closed', () => {
    updateWindow = null
  })
}

// 创建图片查看窗口
function createViewerWindow(imageUrl, imageName, imageInfo) {
  if (viewerWindow && !viewerWindow.isDestroyed()) {
    viewerWindow.destroy()
    viewerWindow = null
  }

  viewerWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    frame: false,
    title: imageName || '图片查看',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
    backgroundColor: '#000000',
    show: false
  })

  const params = `url=${encodeURIComponent(imageUrl || '')}&name=${encodeURIComponent(imageName || '')}&info=${encodeURIComponent(JSON.stringify(imageInfo || {}))}`
  
  if (isDev) {
    viewerWindow.loadURL(`${VITE_DEV_URL}#/viewer?${params}`)
  } else {
    viewerWindow.loadFile(path.join(__dirname, '../web/index.html'), { hash: `/viewer?${params}` })
  }

  viewerWindow.once('ready-to-show', () => {
    viewerWindow.show()
  })

  viewerWindow.on('closed', () => {
    viewerWindow = null
  })
}

// 创建相册详情窗口
let albumDetailWindow = null

function createAlbumDetailWindow(albumId, albumName) {
  if (albumDetailWindow) {
    albumDetailWindow.destroy()
    albumDetailWindow = null
  }

  albumDetailWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    frame: false,
    title: albumName || '相册详情',
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    },
    backgroundColor: '#ffffff',
    show: false
  })

  const params = `id=${albumId}`
  if (isDev) {
    albumDetailWindow.loadURL(`${VITE_DEV_URL}#/square-album-detail?${params}`)
  } else {
    albumDetailWindow.loadFile(path.join(__dirname, '../web/index.html'), { hash: `/square-album-detail?${params}` })
  }

  albumDetailWindow.once('ready-to-show', () => {
    albumDetailWindow.show()
  })

  albumDetailWindow.on('closed', () => {
    albumDetailWindow = null
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

ipcMain.handle('open-pay-window', (event, planId, priceId) => {
  setTimeout(() => {
    createPayWindow(planId, priceId)
  }, 100)
})

ipcMain.handle('close-pay-window', () => {
  if (payWindow) {
    payWindow.close()
    payWindow = null
  }
})

// 图片查看窗口
ipcMain.handle('open-viewer-window', async (event, imageUrl, imageName, imageInfo) => {
  try {
    createViewerWindow(imageUrl, imageName, imageInfo)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('close-viewer-window', () => {
  if (viewerWindow) {
    viewerWindow.close()
    viewerWindow = null
  }
})

// 相册详情窗口
ipcMain.handle('open-album-detail-window', (event, albumId, albumName) => {
  setTimeout(() => {
    createAlbumDetailWindow(albumId, albumName)
  }, 100)
})

// 关闭当前窗口
ipcMain.handle('close-current-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win && !win.isDestroyed()) {
    win.close()
  }
})

// 关闭相册详情窗口
ipcMain.handle('close-album-detail-window', () => {
  if (albumDetailWindow && !albumDetailWindow.isDestroyed()) {
    albumDetailWindow.close()
    albumDetailWindow = null
  }
})

// 监听支付成功消息，置顶主窗口并通知刷新
ipcMain.on('pay-success', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    mainWindow.setAlwaysOnTop(true)
    mainWindow.setAlwaysOnTop(false)
    mainWindow.focus()
    mainWindow.webContents.send('pay-success')
  }
})

// 抓取支付宝页面提取二维码（用隐藏窗口渲染后提取）



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
  createUpdateWindow()
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

// 获取系统默认图片目录
ipcMain.handle('get-default-pictures-dir', () => {
  const platform = process.platform
  const homeDir = os.homedir()

  if (platform === 'win32') {
    // Windows: 获取用户图片文件夹
    return path.join(homeDir, 'Pictures')
  } else if (platform === 'darwin') {
    // macOS: 获取图片文件夹
    return path.join(homeDir, 'Pictures')
  } else {
    // Linux: 获取 XDG_PICTURES_DIR 环境变量或默认 ~/Pictures
    return path.join(homeDir, 'Pictures')
  }
})

// 获取应用缓存目录
ipcMain.handle('get-cache-directory', () => {
  const platform = process.platform
  const appPath = app.getPath('userData')

  if (platform === 'win32') {
    return path.join(appPath, 'Cache')
  } else if (platform === 'darwin') {
    return path.join(appPath, 'Cache')
  } else {
    return path.join(appPath, 'Cache')
  }
})

// 获取下载目录
ipcMain.handle('get-download-directory', () => {
  return app.getPath('downloads')
})

// 扩展名映射
const mimeToExtension = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
  'image/svg+xml': '.svg',
  'image/tiff': '.tiff',
  'image/x-icon': '.ico'
}

// 下载文件到指定目录
ipcMain.handle('download-file', async (event, url, filename, savePath) => {
  try {
    const https = await import('https')
    const http = await import('http')
    const fs = await import('fs')

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http

      // 处理文件名中的 @ 参数，如: xxx.jpg@976w_550h_!web-home-carousel-cover
      if (filename && filename.includes('@')) {
        filename = filename.split('@')[0]
      }

      const filePath = path.join(savePath, filename)
      const file = fs.createWriteStream(filePath)

      protocol.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // 处理重定向
          const redirectUrl = response.headers.location
          protocol.get(redirectUrl, (redirectResponse) => {
            // 从重定向响应中获取 Content-Type
            const contentType = redirectResponse.headers['content-type']
            let ext = path.extname(filename)
            if (!ext && contentType && mimeToExtension[contentType]) {
              ext = mimeToExtension[contentType]
              filename = filename + ext
              const newFilePath = path.join(savePath, filename)
              file.close()
              const newFile = fs.createWriteStream(newFilePath)
              redirectResponse.pipe(newFile)
              redirectResponse.on('end', () => {
                newFile.close()
                resolve({ success: true, path: newFilePath })
              })
            } else {
              redirectResponse.pipe(file)
              redirectResponse.on('end', () => {
                file.close()
                resolve({ success: true, path: filePath })
              })
            }
          }).on('error', reject)
        } else {
          // 从响应中获取 Content-Type
          const contentType = response.headers['content-type']
          let ext = path.extname(filename)
          if (!ext && contentType && mimeToExtension[contentType]) {
            ext = mimeToExtension[contentType]
            filename = filename + ext
            const newFilePath = path.join(savePath, filename)
            file.close()
            const newFile = fs.createWriteStream(newFilePath)
            response.pipe(newFile)
            response.on('end', () => {
              newFile.close()
              resolve({ success: true, path: newFilePath })
            })
          } else {
            response.pipe(file)
            response.on('end', () => {
              file.close()
              resolve({ success: true, path: filePath })
            })
          }
        }
      }).on('error', reject)
    })
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// 选择目录对话框
ipcMain.handle('select-directory', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: options?.title || '选择目录'
  })
  return result.canceled ? null : result.filePaths[0]
})

// 发送通知
ipcMain.handle('show-notification', (event, options) => {
  if (Notification.isSupported()) {
    try {
      const notification = new Notification({
        title: options.title || '',
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
  isQuitting = true
  mainWindow = null
})
