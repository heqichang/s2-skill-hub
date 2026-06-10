import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/types/ipc'
import type {
  ConfigGetResponse,
  ConfigSetParams,
  ConfigSetResponse,
  ConfigGetRepoPathResponse,
  ConfigSetRepoPathParams,
  ConfigSelectDirectoryParams,
  ConfigSelectDirectoryResponse,
  ConfigSelectFileParams,
  ConfigSelectFileResponse,
  IpcResponse
} from '@shared/types/ipc'
import { serviceManager } from '../../services/serviceManager'
import { success, handleError } from '../utils'

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows.length > 0 ? windows[0] : null
}

export function registerConfigHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.CONFIG.GET, async (): Promise<IpcResponse<ConfigGetResponse>> => {
    try {
      const configService = serviceManager.getConfigService()
      const config = await configService.getConfig()
      return success({ config })
    } catch (err) {
      return handleError(err, 'CONFIG_GET_ERROR')
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.CONFIG.SET,
    async (_event, params: ConfigSetParams): Promise<IpcResponse<ConfigSetResponse>> => {
      try {
        const configService = serviceManager.getConfigService()
        const config = await configService.setConfig(params.config)

        if (params.config.repoPath !== undefined) {
          await serviceManager.reinitializeServices()
        }

        return success({ config })
      } catch (err) {
        return handleError(err, 'CONFIG_SET_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.CONFIG.GET_REPO_PATH,
    async (): Promise<IpcResponse<ConfigGetRepoPathResponse>> => {
      try {
        const configService = serviceManager.getConfigService()
        const repoPath = await configService.getRepoPath()
        return success({ repoPath })
      } catch (err) {
        return handleError(err, 'CONFIG_GET_REPO_PATH_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.CONFIG.SET_REPO_PATH,
    async (_event, params: ConfigSetRepoPathParams): Promise<IpcResponse<void>> => {
      try {
        const configService = serviceManager.getConfigService()
        await configService.setRepoPath(params.repoPath)
        await serviceManager.reinitializeServices()
        return success(undefined as unknown as void)
      } catch (err) {
        return handleError(err, 'CONFIG_SET_REPO_PATH_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.CONFIG.SELECT_DIRECTORY,
    async (
      _event,
      params?: ConfigSelectDirectoryParams
    ): Promise<IpcResponse<ConfigSelectDirectoryResponse>> => {
      try {
        const mainWindow = getMainWindow()
        const result = await dialog.showOpenDialog(mainWindow!, {
          title: params?.title || '选择目录',
          defaultPath: params?.defaultPath,
          properties: ['openDirectory']
        })

        if (result.canceled || result.filePaths.length === 0) {
          return success({ path: null })
        }

        return success({ path: result.filePaths[0] })
      } catch (err) {
        return handleError(err, 'CONFIG_SELECT_DIRECTORY_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.CONFIG.SELECT_FILE,
    async (
      _event,
      params?: ConfigSelectFileParams
    ): Promise<IpcResponse<ConfigSelectFileResponse>> => {
      try {
        const mainWindow = getMainWindow()
        const result = await dialog.showOpenDialog(mainWindow!, {
          title: params?.title || '选择文件',
          defaultPath: params?.defaultPath,
          filters: params?.filters,
          properties: ['openFile']
        })

        if (result.canceled || result.filePaths.length === 0) {
          return success({ path: null })
        }

        return success({ path: result.filePaths[0] })
      } catch (err) {
        return handleError(err, 'CONFIG_SELECT_FILE_ERROR')
      }
    }
  )
}
