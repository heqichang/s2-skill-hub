import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types/ipc'
import type {
  SyncGetToolInfosResponse,
  SyncGetToolInfoParams,
  SyncGetToolInfoResponse,
  SyncSkillToToolParams,
  SyncSkillToAllToolsParams,
  SyncAllSkillsToToolParams,
  SyncGetSkillSyncStatesParams,
  SyncGetSkillSyncStatesResponse,
  SyncGetAllSkillsSyncStatesResponse,
  SyncRemoveSkillFromToolParams,
  IpcResponse
} from '@shared/types/ipc'
import { serviceManager } from '../../services/serviceManager'
import { success, handleError } from '../utils'

export function registerSyncHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.SYNC.GET_TOOL_INFOS,
    async (): Promise<IpcResponse<SyncGetToolInfosResponse>> => {
      try {
        const syncService = serviceManager.getSyncService()
        const tools = await syncService.getAllToolInfos()
        return success({ tools })
      } catch (err) {
        return handleError(err, 'SYNC_GET_TOOL_INFOS_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SYNC.GET_TOOL_INFO,
    async (
      _event,
      params: SyncGetToolInfoParams
    ): Promise<IpcResponse<SyncGetToolInfoResponse>> => {
      try {
        const syncService = serviceManager.getSyncService()
        const tool = await syncService.getToolInfo(params.toolType)
        return success({ tool })
      } catch (err) {
        return handleError(err, 'SYNC_GET_TOOL_INFO_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SYNC.SYNC_SKILL_TO_TOOL,
    async (_event, params: SyncSkillToToolParams): Promise<IpcResponse<void>> => {
      try {
        const syncService = serviceManager.getSyncService()
        await syncService.syncSkillToTool(params.skillId, params.toolType)
        return success(undefined as unknown as void)
      } catch (err) {
        return handleError(err, 'SYNC_SKILL_TO_TOOL_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SYNC.SYNC_SKILL_TO_ALL_TOOLS,
    async (_event, params: SyncSkillToAllToolsParams): Promise<IpcResponse<void>> => {
      try {
        const syncService = serviceManager.getSyncService()
        await syncService.syncSkillToAllTools(params.skillId)
        return success(undefined as unknown as void)
      } catch (err) {
        return handleError(err, 'SYNC_SKILL_TO_ALL_TOOLS_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SYNC.SYNC_ALL_SKILLS_TO_TOOL,
    async (_event, params: SyncAllSkillsToToolParams): Promise<IpcResponse<void>> => {
      try {
        const syncService = serviceManager.getSyncService()
        await syncService.syncAllSkillsToTool(params.toolType)
        return success(undefined as unknown as void)
      } catch (err) {
        return handleError(err, 'SYNC_ALL_SKILLS_TO_TOOL_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SYNC.SYNC_ALL_SKILLS_TO_ALL_TOOLS,
    async (): Promise<IpcResponse<void>> => {
      try {
        const syncService = serviceManager.getSyncService()
        await syncService.syncAllSkillsToAllTools()
        return success(undefined as unknown as void)
      } catch (err) {
        return handleError(err, 'SYNC_ALL_SKILLS_TO_ALL_TOOLS_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SYNC.GET_SKILL_SYNC_STATES,
    async (
      _event,
      params: SyncGetSkillSyncStatesParams
    ): Promise<IpcResponse<SyncGetSkillSyncStatesResponse>> => {
      try {
        const syncService = serviceManager.getSyncService()
        const states = await syncService.getSkillSyncStates(params.skillId)
        return success({ states })
      } catch (err) {
        return handleError(err, 'SYNC_GET_SKILL_SYNC_STATES_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SYNC.GET_ALL_SKILLS_SYNC_STATES,
    async (): Promise<IpcResponse<SyncGetAllSkillsSyncStatesResponse>> => {
      try {
        const syncService = serviceManager.getSyncService()
        const statesMap = await syncService.getAllSkillsSyncStates()
        const states: Array<{ skillId: string; states: SyncGetSkillSyncStatesResponse['states'] }> =
          []
        for (const [skillId, stateList] of statesMap) {
          states.push({ skillId, states: stateList })
        }
        return success({ states })
      } catch (err) {
        return handleError(err, 'SYNC_GET_ALL_SKILLS_SYNC_STATES_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SYNC.REMOVE_SKILL_FROM_TOOL,
    async (_event, params: SyncRemoveSkillFromToolParams): Promise<IpcResponse<void>> => {
      try {
        const syncService = serviceManager.getSyncService()
        await syncService.removeSkillFromTool(params.skillId, params.toolType)
        return success(undefined as unknown as void)
      } catch (err) {
        return handleError(err, 'SYNC_REMOVE_SKILL_FROM_TOOL_ERROR')
      }
    }
  )
}
