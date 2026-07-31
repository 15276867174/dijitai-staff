import { app, BrowserWindow, Menu, shell, ipcMain, protocol, net } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'
import { pathToFileURL } from 'url'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: '数字员工助手',
    icon: join(__dirname, '../../resources/icon.png'),
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    // F12 for DevTools
    mainWindow?.webContents.on('before-input-event', (_e, input) => {
      if (input.key === 'F12' && input.type === 'keyDown') {
        mainWindow?.webContents.toggleDevTools()
      }
    })
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Window control IPC
  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized())

  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximizeChange', true))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximizeChange', false))

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Register custom protocol for local file access
  protocol.handle('local-file', (request) => {
    const rawPath = request.url.slice('local-file:///'.length)
    const filePath = decodeURIComponent(rawPath)
    return net.fetch(pathToFileURL(filePath).toString())
  })

  Menu.setApplicationMenu(null)
  createWindow()
  registerIpcHandlers(mainWindow!)

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
