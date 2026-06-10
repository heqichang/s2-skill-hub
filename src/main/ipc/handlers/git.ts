import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types/ipc'
import type {
  GitInitResponse,
  GitIsRepoResponse,
  GitGetStatusResponse,
  GitCommitParams,
  GitCommitResponse,
  GitGetHistoryParams,
  GitGetHistoryResponse,
  GitGetCommitParams,
  GitGetCommitResponse,
  GitGetDiffParams,
  GitGetDiffResponse,
  GitGetFileDiffParams,
  GitGetFileDiffResponse,
  GitRollbackParams,
  IpcResponse
} from '@shared/types/ipc'
import { serviceManager } from '../../services/serviceManager'
import { success, handleError } from '../utils'

export function registerGitHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GIT.INIT, async (): Promise<IpcResponse<GitInitResponse>> => {
    try {
      const gitService = serviceManager.getGitService()
      await gitService.init()
      return success({ success: true })
    } catch (err) {
      return handleError(err, 'GIT_INIT_ERROR')
    }
  })

  ipcMain.handle(IPC_CHANNELS.GIT.IS_REPO, async (): Promise<IpcResponse<GitIsRepoResponse>> => {
    try {
      if (!serviceManager.isRepoReady()) {
        return success({ isRepo: false })
      }
      const gitService = serviceManager.getGitService()
      const isRepo = await gitService.isRepo()
      return success({ isRepo })
    } catch (err) {
      return handleError(err, 'GIT_CHECK_REPO_ERROR')
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.GIT.GET_STATUS,
    async (): Promise<IpcResponse<GitGetStatusResponse>> => {
      try {
        const gitService = serviceManager.getGitService()
        const status = await gitService.getStatus()
        return success({ status })
      } catch (err) {
        return handleError(err, 'GIT_GET_STATUS_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.GIT.COMMIT,
    async (_event, params: GitCommitParams): Promise<IpcResponse<GitCommitResponse>> => {
      try {
        const gitService = serviceManager.getGitService()
        const configService = serviceManager.getConfigService()
        const gitConfig = await configService.getGitConfig()
        const author =
          gitConfig.name && gitConfig.email
            ? { name: gitConfig.name, email: gitConfig.email }
            : undefined
        const commit = await gitService.commit(params.message, author)
        return success({ commit })
      } catch (err) {
        return handleError(err, 'GIT_COMMIT_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.GIT.GET_HISTORY,
    async (_event, params?: GitGetHistoryParams): Promise<IpcResponse<GitGetHistoryResponse>> => {
      try {
        const gitService = serviceManager.getGitService()
        const commits = await gitService.getHistory(params?.limit)
        return success({ commits })
      } catch (err) {
        return handleError(err, 'GIT_GET_HISTORY_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.GIT.GET_COMMIT,
    async (_event, params: GitGetCommitParams): Promise<IpcResponse<GitGetCommitResponse>> => {
      try {
        const gitService = serviceManager.getGitService()
        const commit = await gitService.getCommit(params.hash)
        return success({ commit })
      } catch (err) {
        return handleError(err, 'GIT_GET_COMMIT_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.GIT.GET_DIFF,
    async (_event, params?: GitGetDiffParams): Promise<IpcResponse<GitGetDiffResponse>> => {
      try {
        const gitService = serviceManager.getGitService()
        const diff = await gitService.getDiff(params?.hash)
        return success({ diff })
      } catch (err) {
        return handleError(err, 'GIT_GET_DIFF_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.GIT.GET_FILE_DIFF,
    async (_event, params: GitGetFileDiffParams): Promise<IpcResponse<GitGetFileDiffResponse>> => {
      try {
        const gitService = serviceManager.getGitService()
        const diff = await gitService.getFileDiff(params.filePath, params.hash)
        return success({ diff })
      } catch (err) {
        return handleError(err, 'GIT_GET_FILE_DIFF_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.GIT.ROLLBACK,
    async (_event, params: GitRollbackParams): Promise<IpcResponse<void>> => {
      try {
        const gitService = serviceManager.getGitService()
        await gitService.rollback(params.hash)
        return success(undefined as unknown as void)
      } catch (err) {
        return handleError(err, 'GIT_ROLLBACK_ERROR')
      }
    }
  )
}
