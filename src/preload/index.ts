import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/types/ipc'
import type {
  IpcApi,
  RepoInitParams,
  RepoIsInitializedResponse,
  ListSkillsResponse,
  GetSkillParams,
  GetSkillResponse,
  CreateSkillParams,
  CreateSkillResponse,
  UpdateSkillParams,
  UpdateSkillResponse,
  DeleteSkillParams,
  SearchSkillsParams,
  SearchSkillsResponse,
  ListCategoriesResponse,
  CreateCategoryParams,
  CreateCategoryResponse,
  UpdateCategoryParams,
  UpdateCategoryResponse,
  DeleteCategoryParams,
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
  ConfigGetResponse,
  ConfigSetParams,
  ConfigSetResponse,
  ConfigGetRepoPathResponse,
  ConfigSetRepoPathParams,
  ConfigSelectDirectoryParams,
  ConfigSelectDirectoryResponse,
  ConfigSelectFileParams,
  ConfigSelectFileResponse,
  PingResponse,
  AppVersionResponse,
  OpenExternalParams,
  IpcResponse
} from '@shared/types/ipc'

const ipcApi: IpcApi = {
  app: {
    ping: () => ipcRenderer.invoke(IPC_CHANNELS.APP.PING) as Promise<PingResponse>,
    getAppVersion: () =>
      ipcRenderer.invoke(IPC_CHANNELS.APP.GET_APP_VERSION) as Promise<AppVersionResponse>,
    openExternal: (params: OpenExternalParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.APP.OPEN_EXTERNAL, params) as Promise<void>
  },
  repo: {
    init: (params: RepoInitParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPO.INIT, params) as Promise<IpcResponse<void>>,
    isInitialized: () =>
      ipcRenderer.invoke(IPC_CHANNELS.REPO.IS_INITIALIZED) as Promise<
        IpcResponse<RepoIsInitializedResponse>
      >,
    listSkills: () =>
      ipcRenderer.invoke(IPC_CHANNELS.REPO.LIST_SKILLS) as Promise<IpcResponse<ListSkillsResponse>>,
    getSkill: (params: GetSkillParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPO.GET_SKILL, params) as Promise<
        IpcResponse<GetSkillResponse>
      >,
    createSkill: (params: CreateSkillParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPO.CREATE_SKILL, params) as Promise<
        IpcResponse<CreateSkillResponse>
      >,
    updateSkill: (params: UpdateSkillParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPO.UPDATE_SKILL, params) as Promise<
        IpcResponse<UpdateSkillResponse>
      >,
    deleteSkill: (params: DeleteSkillParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPO.DELETE_SKILL, params) as Promise<IpcResponse<void>>,
    searchSkills: (params: SearchSkillsParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPO.SEARCH_SKILLS, params) as Promise<
        IpcResponse<SearchSkillsResponse>
      >,
    listCategories: () =>
      ipcRenderer.invoke(IPC_CHANNELS.REPO.LIST_CATEGORIES) as Promise<
        IpcResponse<ListCategoriesResponse>
      >,
    createCategory: (params: CreateCategoryParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPO.CREATE_CATEGORY, params) as Promise<
        IpcResponse<CreateCategoryResponse>
      >,
    updateCategory: (params: UpdateCategoryParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPO.UPDATE_CATEGORY, params) as Promise<
        IpcResponse<UpdateCategoryResponse>
      >,
    deleteCategory: (params: DeleteCategoryParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPO.DELETE_CATEGORY, params) as Promise<IpcResponse<void>>
  },
  git: {
    init: () => ipcRenderer.invoke(IPC_CHANNELS.GIT.INIT) as Promise<IpcResponse<GitInitResponse>>,
    isRepo: () =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT.IS_REPO) as Promise<IpcResponse<GitIsRepoResponse>>,
    getStatus: () =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT.GET_STATUS) as Promise<IpcResponse<GitGetStatusResponse>>,
    commit: (params: GitCommitParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT.COMMIT, params) as Promise<
        IpcResponse<GitCommitResponse>
      >,
    getHistory: (params?: GitGetHistoryParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT.GET_HISTORY, params) as Promise<
        IpcResponse<GitGetHistoryResponse>
      >,
    getCommit: (params: GitGetCommitParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT.GET_COMMIT, params) as Promise<
        IpcResponse<GitGetCommitResponse>
      >,
    getDiff: (params?: GitGetDiffParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT.GET_DIFF, params) as Promise<
        IpcResponse<GitGetDiffResponse>
      >,
    getFileDiff: (params: GitGetFileDiffParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT.GET_FILE_DIFF, params) as Promise<
        IpcResponse<GitGetFileDiffResponse>
      >,
    rollback: (params: GitRollbackParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.GIT.ROLLBACK, params) as Promise<IpcResponse<void>>
  },
  sync: {
    getToolInfos: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC.GET_TOOL_INFOS) as Promise<
        IpcResponse<SyncGetToolInfosResponse>
      >,
    getToolInfo: (params: SyncGetToolInfoParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC.GET_TOOL_INFO, params) as Promise<
        IpcResponse<SyncGetToolInfoResponse>
      >,
    syncSkillToTool: (params: SyncSkillToToolParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC.SYNC_SKILL_TO_TOOL, params) as Promise<
        IpcResponse<void>
      >,
    syncSkillToAllTools: (params: SyncSkillToAllToolsParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC.SYNC_SKILL_TO_ALL_TOOLS, params) as Promise<
        IpcResponse<void>
      >,
    syncAllSkillsToTool: (params: SyncAllSkillsToToolParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC.SYNC_ALL_SKILLS_TO_TOOL, params) as Promise<
        IpcResponse<void>
      >,
    syncAllSkillsToAllTools: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC.SYNC_ALL_SKILLS_TO_ALL_TOOLS) as Promise<
        IpcResponse<void>
      >,
    getSkillSyncStates: (params: SyncGetSkillSyncStatesParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC.GET_SKILL_SYNC_STATES, params) as Promise<
        IpcResponse<SyncGetSkillSyncStatesResponse>
      >,
    getAllSkillsSyncStates: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC.GET_ALL_SKILLS_SYNC_STATES) as Promise<
        IpcResponse<SyncGetAllSkillsSyncStatesResponse>
      >,
    removeSkillFromTool: (params: SyncRemoveSkillFromToolParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.SYNC.REMOVE_SKILL_FROM_TOOL, params) as Promise<
        IpcResponse<void>
      >
  },
  config: {
    get: () =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFIG.GET) as Promise<IpcResponse<ConfigGetResponse>>,
    set: (params: ConfigSetParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFIG.SET, params) as Promise<
        IpcResponse<ConfigSetResponse>
      >,
    getRepoPath: () =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFIG.GET_REPO_PATH) as Promise<
        IpcResponse<ConfigGetRepoPathResponse>
      >,
    setRepoPath: (params: ConfigSetRepoPathParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFIG.SET_REPO_PATH, params) as Promise<IpcResponse<void>>,
    selectDirectory: (params?: ConfigSelectDirectoryParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFIG.SELECT_DIRECTORY, params) as Promise<
        IpcResponse<ConfigSelectDirectoryResponse>
      >,
    selectFile: (params?: ConfigSelectFileParams) =>
      ipcRenderer.invoke(IPC_CHANNELS.CONFIG.SELECT_FILE, params) as Promise<
        IpcResponse<ConfigSelectFileResponse>
      >
  }
}

contextBridge.exposeInMainWorld('ipcApi', ipcApi)
