import type { Skill, Category } from './skill'
import type { GitCommit, GitStatus, GitDiff } from './git'
import type { ToolType, ToolInfo, SyncState } from './adapter'
import type { Config } from '@main/services/config'

export interface IpcSuccessResponse<T> {
  success: true
  data: T
}

export interface IpcErrorResponse {
  success: false
  error: {
    message: string
    code?: string
  }
}

export type IpcResponse<T> = IpcSuccessResponse<T> | IpcErrorResponse

export const IPC_CHANNELS = {
  APP: {
    PING: 'app:ping',
    GET_APP_VERSION: 'app:get-version',
    OPEN_EXTERNAL: 'app:open-external'
  },
  REPO: {
    INIT: 'repo:init',
    IS_INITIALIZED: 'repo:isInitialized',
    LIST_SKILLS: 'repo:listSkills',
    GET_SKILL: 'repo:getSkill',
    CREATE_SKILL: 'repo:createSkill',
    UPDATE_SKILL: 'repo:updateSkill',
    DELETE_SKILL: 'repo:deleteSkill',
    SEARCH_SKILLS: 'repo:searchSkills',
    LIST_CATEGORIES: 'repo:listCategories',
    CREATE_CATEGORY: 'repo:createCategory',
    UPDATE_CATEGORY: 'repo:updateCategory',
    DELETE_CATEGORY: 'repo:deleteCategory'
  },
  GIT: {
    INIT: 'git:init',
    IS_REPO: 'git:isRepo',
    GET_STATUS: 'git:getStatus',
    COMMIT: 'git:commit',
    GET_HISTORY: 'git:getHistory',
    GET_COMMIT: 'git:getCommit',
    GET_DIFF: 'git:getDiff',
    GET_FILE_DIFF: 'git:getFileDiff',
    ROLLBACK: 'git:rollback'
  },
  SYNC: {
    GET_TOOL_INFOS: 'sync:getToolInfos',
    GET_TOOL_INFO: 'sync:getToolInfo',
    SYNC_SKILL_TO_TOOL: 'sync:syncSkillToTool',
    SYNC_SKILL_TO_ALL_TOOLS: 'sync:syncSkillToAllTools',
    SYNC_ALL_SKILLS_TO_TOOL: 'sync:syncAllSkillsToTool',
    SYNC_ALL_SKILLS_TO_ALL_TOOLS: 'sync:syncAllSkillsToAllTools',
    GET_SKILL_SYNC_STATES: 'sync:getSkillSyncStates',
    GET_ALL_SKILLS_SYNC_STATES: 'sync:getAllSkillsSyncStates',
    REMOVE_SKILL_FROM_TOOL: 'sync:removeSkillFromTool'
  },
  CONFIG: {
    GET: 'config:get',
    SET: 'config:set',
    GET_REPO_PATH: 'config:getRepoPath',
    SET_REPO_PATH: 'config:setRepoPath',
    SELECT_DIRECTORY: 'config:selectDirectory',
    SELECT_FILE: 'config:selectFile'
  }
} as const

export type IpcChannel =
  | (typeof IPC_CHANNELS.APP)[keyof typeof IPC_CHANNELS.APP]
  | (typeof IPC_CHANNELS.REPO)[keyof typeof IPC_CHANNELS.REPO]
  | (typeof IPC_CHANNELS.GIT)[keyof typeof IPC_CHANNELS.GIT]
  | (typeof IPC_CHANNELS.SYNC)[keyof typeof IPC_CHANNELS.SYNC]
  | (typeof IPC_CHANNELS.CONFIG)[keyof typeof IPC_CHANNELS.CONFIG]

export interface PingResponse {
  message: string
  timestamp: number
}

export interface AppVersionResponse {
  version: string
}

export interface OpenExternalParams {
  url: string
}

export interface RepoInitParams {
  repoPath: string
}

export interface RepoIsInitializedResponse {
  isInitialized: boolean
}

export interface ListSkillsResponse {
  skills: Skill[]
}

export interface GetSkillParams {
  id: string
}

export interface GetSkillResponse {
  skill: Skill | null
}

export interface CreateSkillParams {
  data: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>
}

export interface CreateSkillResponse {
  skill: Skill
}

export interface UpdateSkillParams {
  id: string
  data: Partial<Omit<Skill, 'id' | 'createdAt'>>
}

export interface UpdateSkillResponse {
  skill: Skill
}

export interface DeleteSkillParams {
  id: string
}

export interface SearchSkillsParams {
  query: string
}

export interface SearchSkillsResponse {
  skills: Skill[]
}

export interface ListCategoriesResponse {
  categories: Category[]
}

export interface CreateCategoryParams {
  data: Omit<Category, 'id'>
}

export interface CreateCategoryResponse {
  category: Category
}

export interface UpdateCategoryParams {
  id: string
  data: Partial<Omit<Category, 'id'>>
}

export interface UpdateCategoryResponse {
  category: Category
}

export interface DeleteCategoryParams {
  id: string
}

export interface GitInitResponse {
  success: boolean
}

export interface GitIsRepoResponse {
  isRepo: boolean
}

export interface GitGetStatusResponse {
  status: GitStatus
}

export interface GitCommitParams {
  message: string
}

export interface GitCommitResponse {
  commit: GitCommit
}

export interface GitGetHistoryParams {
  limit?: number
}

export interface GitGetHistoryResponse {
  commits: GitCommit[]
}

export interface GitGetCommitParams {
  hash: string
}

export interface GitGetCommitResponse {
  commit: GitCommit | null
}

export interface GitGetDiffParams {
  hash?: string
}

export interface GitGetDiffResponse {
  diff: GitDiff[]
}

export interface GitGetFileDiffParams {
  filePath: string
  hash?: string
}

export interface GitGetFileDiffResponse {
  diff: string
}

export interface GitRollbackParams {
  hash: string
}

export interface SyncGetToolInfosResponse {
  tools: ToolInfo[]
}

export interface SyncGetToolInfoParams {
  toolType: ToolType
}

export interface SyncGetToolInfoResponse {
  tool: ToolInfo
}

export interface SyncSkillToToolParams {
  skillId: string
  toolType: ToolType
}

export interface SyncSkillToAllToolsParams {
  skillId: string
}

export interface SyncAllSkillsToToolParams {
  toolType: ToolType
}

export interface SyncGetSkillSyncStatesParams {
  skillId: string
}

export interface SyncGetSkillSyncStatesResponse {
  states: SyncState[]
}

export interface SyncGetAllSkillsSyncStatesResponse {
  states: Array<{ skillId: string; states: SyncState[] }>
}

export interface SyncRemoveSkillFromToolParams {
  skillId: string
  toolType: ToolType
}

export interface ConfigGetResponse {
  config: Config
}

export interface ConfigSetParams {
  config: Partial<Config>
}

export interface ConfigSetResponse {
  config: Config
}

export interface ConfigGetRepoPathResponse {
  repoPath: string
}

export interface ConfigSetRepoPathParams {
  repoPath: string
}

export interface ConfigSelectDirectoryParams {
  title?: string
  defaultPath?: string
}

export interface ConfigSelectDirectoryResponse {
  path: string | null
}

export interface ConfigSelectFileParams {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
}

export interface ConfigSelectFileResponse {
  path: string | null
}

export interface IpcRepoApi {
  init: (params: RepoInitParams) => Promise<IpcResponse<void>>
  isInitialized: () => Promise<IpcResponse<RepoIsInitializedResponse>>
  listSkills: () => Promise<IpcResponse<ListSkillsResponse>>
  getSkill: (params: GetSkillParams) => Promise<IpcResponse<GetSkillResponse>>
  createSkill: (params: CreateSkillParams) => Promise<IpcResponse<CreateSkillResponse>>
  updateSkill: (params: UpdateSkillParams) => Promise<IpcResponse<UpdateSkillResponse>>
  deleteSkill: (params: DeleteSkillParams) => Promise<IpcResponse<void>>
  searchSkills: (params: SearchSkillsParams) => Promise<IpcResponse<SearchSkillsResponse>>
  listCategories: () => Promise<IpcResponse<ListCategoriesResponse>>
  createCategory: (params: CreateCategoryParams) => Promise<IpcResponse<CreateCategoryResponse>>
  updateCategory: (params: UpdateCategoryParams) => Promise<IpcResponse<UpdateCategoryResponse>>
  deleteCategory: (params: DeleteCategoryParams) => Promise<IpcResponse<void>>
}

export interface IpcGitApi {
  init: () => Promise<IpcResponse<GitInitResponse>>
  isRepo: () => Promise<IpcResponse<GitIsRepoResponse>>
  getStatus: () => Promise<IpcResponse<GitGetStatusResponse>>
  commit: (params: GitCommitParams) => Promise<IpcResponse<GitCommitResponse>>
  getHistory: (params?: GitGetHistoryParams) => Promise<IpcResponse<GitGetHistoryResponse>>
  getCommit: (params: GitGetCommitParams) => Promise<IpcResponse<GitGetCommitResponse>>
  getDiff: (params?: GitGetDiffParams) => Promise<IpcResponse<GitGetDiffResponse>>
  getFileDiff: (params: GitGetFileDiffParams) => Promise<IpcResponse<GitGetFileDiffResponse>>
  rollback: (params: GitRollbackParams) => Promise<IpcResponse<void>>
}

export interface IpcSyncApi {
  getToolInfos: () => Promise<IpcResponse<SyncGetToolInfosResponse>>
  getToolInfo: (params: SyncGetToolInfoParams) => Promise<IpcResponse<SyncGetToolInfoResponse>>
  syncSkillToTool: (params: SyncSkillToToolParams) => Promise<IpcResponse<void>>
  syncSkillToAllTools: (params: SyncSkillToAllToolsParams) => Promise<IpcResponse<void>>
  syncAllSkillsToTool: (params: SyncAllSkillsToToolParams) => Promise<IpcResponse<void>>
  syncAllSkillsToAllTools: () => Promise<IpcResponse<void>>
  getSkillSyncStates: (
    params: SyncGetSkillSyncStatesParams
  ) => Promise<IpcResponse<SyncGetSkillSyncStatesResponse>>
  getAllSkillsSyncStates: () => Promise<IpcResponse<SyncGetAllSkillsSyncStatesResponse>>
  removeSkillFromTool: (params: SyncRemoveSkillFromToolParams) => Promise<IpcResponse<void>>
}

export interface IpcConfigApi {
  get: () => Promise<IpcResponse<ConfigGetResponse>>
  set: (params: ConfigSetParams) => Promise<IpcResponse<ConfigSetResponse>>
  getRepoPath: () => Promise<IpcResponse<ConfigGetRepoPathResponse>>
  setRepoPath: (params: ConfigSetRepoPathParams) => Promise<IpcResponse<void>>
  selectDirectory: (
    params?: ConfigSelectDirectoryParams
  ) => Promise<IpcResponse<ConfigSelectDirectoryResponse>>
  selectFile: (params?: ConfigSelectFileParams) => Promise<IpcResponse<ConfigSelectFileResponse>>
}

export interface IpcAppApi {
  ping: () => Promise<PingResponse>
  getAppVersion: () => Promise<AppVersionResponse>
  openExternal: (params: OpenExternalParams) => Promise<void>
}

export interface IpcApi {
  app: IpcAppApi
  repo: IpcRepoApi
  git: IpcGitApi
  sync: IpcSyncApi
  config: IpcConfigApi
}

declare global {
  interface Window {
    ipcApi: IpcApi
  }
}
