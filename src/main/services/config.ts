import { app } from 'electron'
import { join } from 'node:path'
import { readFile, writeFile, access, constants, mkdir } from 'node:fs/promises'
import { ToolType } from '@shared/types/adapter'

export interface Config {
  repoPath: string
  tools: Record<ToolType, { skillDirPath: string | null }>
  git: { name?: string; email?: string }
  ui: { theme?: 'light' | 'dark'; viewMode?: 'list' | 'card' }
}

const DEFAULT_CONFIG: Config = {
  repoPath: '',
  tools: {
    [ToolType.CLAUDE]: { skillDirPath: null },
    [ToolType.CURSOR]: { skillDirPath: null },
    [ToolType.TRAE]: { skillDirPath: null }
  },
  git: {},
  ui: {}
}

const CONFIG_FILE = 'config.json'

export class ConfigService {
  private configPath: string
  private config: Config | null = null

  constructor() {
    this.configPath = join(app.getPath('userData'), CONFIG_FILE)
  }

  async init(): Promise<void> {
    try {
      await access(app.getPath('userData'), constants.F_OK)
    } catch {
      await mkdir(app.getPath('userData'), { recursive: true })
    }

    try {
      await access(this.configPath, constants.F_OK)
      const raw = await readFile(this.configPath, 'utf-8')
      const loadedConfig = JSON.parse(raw) as Partial<Config>
      this.config = this.mergeConfig(DEFAULT_CONFIG, loadedConfig)
    } catch {
      this.config = { ...DEFAULT_CONFIG }
      await this.saveConfig()
    }
  }

  async getConfig(): Promise<Config> {
    if (!this.config) {
      await this.init()
    }
    return { ...this.config! }
  }

  async setConfig(config: Partial<Config>): Promise<Config> {
    if (!this.config) {
      await this.init()
    }
    this.config = this.mergeConfig(this.config!, config)
    await this.saveConfig()
    return { ...this.config! }
  }

  async getRepoPath(): Promise<string> {
    const config = await this.getConfig()
    return config.repoPath
  }

  async setRepoPath(repoPath: string): Promise<void> {
    await this.setConfig({ repoPath })
  }

  async getGitConfig(): Promise<{ name?: string; email?: string }> {
    const config = await this.getConfig()
    return { ...config.git }
  }

  async setGitConfig(gitConfig: { name?: string; email?: string }): Promise<void> {
    await this.setConfig({ git: gitConfig })
  }

  async getUiConfig(): Promise<{ theme?: 'light' | 'dark'; viewMode?: 'list' | 'card' }> {
    const config = await this.getConfig()
    return { ...config.ui }
  }

  async setUiConfig(uiConfig: {
    theme?: 'light' | 'dark'
    viewMode?: 'list' | 'card'
  }): Promise<void> {
    await this.setConfig({ ui: uiConfig })
  }

  async getToolConfig(toolType: ToolType): Promise<{ skillDirPath: string | null }> {
    const config = await this.getConfig()
    return { ...config.tools[toolType] }
  }

  async setToolConfig(
    toolType: ToolType,
    toolConfig: { skillDirPath: string | null }
  ): Promise<void> {
    const config = await this.getConfig()
    config.tools[toolType] = toolConfig
    await this.setConfig({ tools: config.tools })
  }

  private mergeConfig(base: Config, override: Partial<Config>): Config {
    const result = { ...base }

    if (override.repoPath !== undefined) {
      result.repoPath = override.repoPath
    }

    if (override.tools) {
      result.tools = {
        ...result.tools,
        ...override.tools
      }
    }

    if (override.git) {
      result.git = {
        ...result.git,
        ...override.git
      }
    }

    if (override.ui) {
      result.ui = {
        ...result.ui,
        ...override.ui
      }
    }

    return result
  }

  private async saveConfig(): Promise<void> {
    await writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8')
  }
}
