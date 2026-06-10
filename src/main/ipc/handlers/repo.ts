import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/types/ipc'
import type {
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
  IpcResponse
} from '@shared/types/ipc'
import { serviceManager } from '../../services/serviceManager'
import { success, handleError } from '../utils'

export function registerRepoHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.REPO.INIT,
    async (_event, params: RepoInitParams): Promise<IpcResponse<void>> => {
      try {
        const configService = serviceManager.getConfigService()
        await configService.setRepoPath(params.repoPath)
        await serviceManager.reinitializeServices()
        const skillRepo = serviceManager.getSkillRepositoryService()
        await skillRepo.init()
        const gitService = serviceManager.getGitService()
        const isRepo = await gitService.isRepo()
        if (!isRepo) {
          await gitService.init()
        }
        return success(undefined as unknown as void)
      } catch (err) {
        return handleError(err, 'REPO_INIT_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.REPO.IS_INITIALIZED,
    async (): Promise<IpcResponse<RepoIsInitializedResponse>> => {
      try {
        if (!serviceManager.isRepoReady()) {
          return success({ isInitialized: false })
        }
        const skillRepo = serviceManager.getSkillRepositoryService()
        const isInitialized = await skillRepo.isInitialized()
        return success({ isInitialized })
      } catch (err) {
        return handleError(err, 'REPO_CHECK_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.REPO.LIST_SKILLS,
    async (): Promise<IpcResponse<ListSkillsResponse>> => {
      try {
        const skillRepo = serviceManager.getSkillRepositoryService()
        const skills = await skillRepo.listSkills()
        return success({ skills })
      } catch (err) {
        return handleError(err, 'REPO_LIST_SKILLS_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.REPO.GET_SKILL,
    async (_event, params: GetSkillParams): Promise<IpcResponse<GetSkillResponse>> => {
      try {
        const skillRepo = serviceManager.getSkillRepositoryService()
        const skill = await skillRepo.getSkill(params.id)
        return success({ skill })
      } catch (err) {
        return handleError(err, 'REPO_GET_SKILL_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.REPO.CREATE_SKILL,
    async (_event, params: CreateSkillParams): Promise<IpcResponse<CreateSkillResponse>> => {
      try {
        const skillRepo = serviceManager.getSkillRepositoryService()
        const skill = await skillRepo.createSkill(params.data)
        return success({ skill })
      } catch (err) {
        return handleError(err, 'REPO_CREATE_SKILL_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.REPO.UPDATE_SKILL,
    async (_event, params: UpdateSkillParams): Promise<IpcResponse<UpdateSkillResponse>> => {
      try {
        const skillRepo = serviceManager.getSkillRepositoryService()
        const skill = await skillRepo.updateSkill(params.id, params.data)
        return success({ skill })
      } catch (err) {
        return handleError(err, 'REPO_UPDATE_SKILL_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.REPO.DELETE_SKILL,
    async (_event, params: DeleteSkillParams): Promise<IpcResponse<void>> => {
      try {
        const skillRepo = serviceManager.getSkillRepositoryService()
        await skillRepo.deleteSkill(params.id)
        return success(undefined as unknown as void)
      } catch (err) {
        return handleError(err, 'REPO_DELETE_SKILL_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.REPO.SEARCH_SKILLS,
    async (_event, params: SearchSkillsParams): Promise<IpcResponse<SearchSkillsResponse>> => {
      try {
        const skillRepo = serviceManager.getSkillRepositoryService()
        const skills = await skillRepo.searchSkills(params.query)
        return success({ skills })
      } catch (err) {
        return handleError(err, 'REPO_SEARCH_SKILLS_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.REPO.LIST_CATEGORIES,
    async (): Promise<IpcResponse<ListCategoriesResponse>> => {
      try {
        const categoryService = serviceManager.getCategoryService()
        const categories = await categoryService.listCategories()
        return success({ categories })
      } catch (err) {
        return handleError(err, 'REPO_LIST_CATEGORIES_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.REPO.CREATE_CATEGORY,
    async (_event, params: CreateCategoryParams): Promise<IpcResponse<CreateCategoryResponse>> => {
      try {
        const categoryService = serviceManager.getCategoryService()
        const category = await categoryService.createCategory(params.data)
        return success({ category })
      } catch (err) {
        return handleError(err, 'REPO_CREATE_CATEGORY_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.REPO.UPDATE_CATEGORY,
    async (_event, params: UpdateCategoryParams): Promise<IpcResponse<UpdateCategoryResponse>> => {
      try {
        const categoryService = serviceManager.getCategoryService()
        const category = await categoryService.updateCategory(params.id, params.data)
        return success({ category })
      } catch (err) {
        return handleError(err, 'REPO_UPDATE_CATEGORY_ERROR')
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.REPO.DELETE_CATEGORY,
    async (_event, params: DeleteCategoryParams): Promise<IpcResponse<void>> => {
      try {
        const categoryService = serviceManager.getCategoryService()
        await categoryService.deleteCategory(params.id)
        return success(undefined as unknown as void)
      } catch (err) {
        return handleError(err, 'REPO_DELETE_CATEGORY_ERROR')
      }
    }
  )
}
