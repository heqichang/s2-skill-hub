import { SkillRepositoryService } from './skillRepository'
import { CategoryService } from './category'
import { GitService } from './git'
import { SyncService } from './syncService'
import { ConfigService } from './config'
import { BaseAdapter, ClaudeAdapter, CursorAdapter, TraeAdapter } from './adapters'
import { ToolType } from '@shared/types/adapter'

export class ServiceManager {
  private configService: ConfigService | null = null
  private skillRepositoryService: SkillRepositoryService | null = null
  private categoryService: CategoryService | null = null
  private gitService: GitService | null = null
  private syncService: SyncService | null = null
  private adapters: BaseAdapter[] = []
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) {
      return
    }

    this.configService = new ConfigService()
    await this.configService.init()

    const config = await this.configService.getConfig()

    this.adapters = this.createAdapters(config)

    if (config.repoPath) {
      this.skillRepositoryService = new SkillRepositoryService(config.repoPath)
      this.categoryService = new CategoryService(config.repoPath)
      this.gitService = new GitService(config.repoPath)
      this.syncService = new SyncService(config.repoPath, this.adapters)
    }

    this.initialized = true
  }

  async reinitializeServices(): Promise<void> {
    const config = await this.getConfigService().getConfig()

    this.adapters = this.createAdapters(config)

    if (config.repoPath) {
      this.skillRepositoryService = new SkillRepositoryService(config.repoPath)
      this.categoryService = new CategoryService(config.repoPath)
      this.gitService = new GitService(config.repoPath)
      this.syncService = new SyncService(config.repoPath, this.adapters)
    } else {
      this.skillRepositoryService = null
      this.categoryService = null
      this.gitService = null
      this.syncService = null
    }
  }

  getConfigService(): ConfigService {
    if (!this.configService) {
      throw new Error('ServiceManager not initialized')
    }
    return this.configService
  }

  getSkillRepositoryService(): SkillRepositoryService {
    if (!this.skillRepositoryService) {
      throw new Error('Skill repository not initialized. Please set repo path first.')
    }
    return this.skillRepositoryService
  }

  getCategoryService(): CategoryService {
    if (!this.categoryService) {
      throw new Error('Category service not initialized. Please set repo path first.')
    }
    return this.categoryService
  }

  getGitService(): GitService {
    if (!this.gitService) {
      throw new Error('Git service not initialized. Please set repo path first.')
    }
    return this.gitService
  }

  getSyncService(): SyncService {
    if (!this.syncService) {
      throw new Error('Sync service not initialized. Please set repo path first.')
    }
    return this.syncService
  }

  getAdapters(): BaseAdapter[] {
    return [...this.adapters]
  }

  isRepoReady(): boolean {
    return this.skillRepositoryService !== null
  }

  private createAdapters(config: Awaited<ReturnType<ConfigService['getConfig']>>): BaseAdapter[] {
    const adapters: BaseAdapter[] = []

    for (const toolType of Object.values(ToolType)) {
      const toolConfig = config.tools[toolType]
      const skillDirPath = toolConfig?.skillDirPath || null

      switch (toolType) {
        case ToolType.CLAUDE:
          adapters.push(new ClaudeAdapter(skillDirPath))
          break
        case ToolType.CURSOR:
          adapters.push(new CursorAdapter(skillDirPath))
          break
        case ToolType.TRAE:
          adapters.push(new TraeAdapter(skillDirPath))
          break
      }
    }

    return adapters
  }
}

export const serviceManager = new ServiceManager()
