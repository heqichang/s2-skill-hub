import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { IPC_CHANNELS, OpenExternalParams } from '@shared/types/ipc'
import { appService } from './services'
import { serviceManager } from './services/serviceManager'
import { registerAllIpcHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function registerAppIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.APP.PING, () => {
    return appService.ping()
  })

  ipcMain.handle(IPC_CHANNELS.APP.GET_APP_VERSION, () => {
    return appService.getAppVersion()
  })

  ipcMain.handle(IPC_CHANNELS.APP.OPEN_EXTERNAL, (_event, params: OpenExternalParams) => {
    return shell.openExternal(params.url)
  })
}

async function initializeServices() {
  try {
    await serviceManager.init()
    console.log('[Main] Services initialized successfully')
  } catch (error) {
    console.error('[Main] Failed to initialize services:', error)
  }
}

app.whenReady().then(async () => {
  await initializeServices()
  registerAppIpcHandlers()
  registerAllIpcHandlers()
  createWindow()

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
  console.log('[Main] Application is quitting')
})
