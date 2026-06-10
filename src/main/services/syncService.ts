import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, access, constants } from 'node:fs/promises'
import { join } from 'node:path'
import { SkillRepositoryService } from './skillRepository'
import { BaseAdapter } from './adapters/base'
import { SyncStatus } from '@shared/types/skill'
import type { ToolInfo, SyncState, SkillSyncInfo, ToolType } from '@shared/types/adapter'
import type { Skill } from '@shared/types/skill'

const SYNC_STATES_DIR = '.skill-hub'
const SYNC_STATES_FILE = 'sync-states.json'

export class SyncService {
  private skillRepoPath: string
  private skillRepo: SkillRepositoryService
  private adapters: BaseAdapter[]
  private syncStatesPath: string

  constructor(skillRepoPath: string, adapters: BaseAdapter[] = []) {
    this.skillRepoPath = skillRepoPath
    this.skillRepo = new SkillRepositoryService(skillRepoPath)
    this.adapters = [...adapters]
    this.syncStatesPath = join(skillRepoPath, SYNC_STATES_DIR, SYNC_STATES_FILE)
  }

  registerAdapter(adapter: BaseAdapter): void {
    this.adapters.push(adapter)
  }

  getAdapters(): BaseAdapter[] {
    return [...this.adapters]
  }

  async getToolInfo(toolType: ToolType): Promise<ToolInfo> {
    const adapter = this.adapters.find((a) => a.toolType === toolType)
    if (!adapter) {
      throw new Error(`Adapter for tool type ${toolType} not found`)
    }

    const isInstalled = await adapter.isInstalled()
    const skillDirPath = isInstalled ? await adapter.detectSkillDir() : null

    return {
      type: adapter.toolType,
      name: adapter.toolName,
      description: `${adapter.toolName} adapter`,
      isInstalled,
      skillDirPath
    }
  }

  async getAllToolInfos(): Promise<ToolInfo[]> {
    const infos: ToolInfo[] = []
    for (const adapter of this.adapters) {
      const info = await this.getToolInfo(adapter.toolType)
      infos.push(info)
    }
    return infos
  }

  async syncSkillToTool(skillId: string, toolType: ToolType): Promise<void> {
    const adapter = this.adapters.find((a) => a.toolType === toolType)
    if (!adapter) {
      throw new Error(`未找到 ${toolType} 的适配器`)
    }

    const skill = await this.skillRepo.getSkill(skillId)
    if (!skill) {
      throw new Error(`未找到 ID 为 ${skillId} 的技能`)
    }

    const isInstalled = await adapter.isInstalled()
    if (!isInstalled) {
      throw new Error(`${adapter.toolName} 未安装，请先安装该工具`)
    }

    const skillDir = await adapter.detectSkillDir()
    if (!skillDir) {
      throw new Error(`未检测到 ${adapter.toolName} 的技能目录，请在设置中手动配置`)
    }

    try {
      await adapter.syncSkill(skill, skillDir)
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      throw new Error(`同步到 ${adapter.toolName} 失败: ${errMsg}`)
    }

    await this.updateSyncState(skillId, toolType, skill)
  }

  async syncSkillToAllTools(skillId: string): Promise<void> {
    const skill = await this.skillRepo.getSkill(skillId)
    if (!skill) {
      throw new Error(`Skill with id ${skillId} not found`)
    }

    for (const adapter of this.adapters) {
      const isInstalled = await adapter.isInstalled()
      if (!isInstalled) {
        continue
      }

      const skillDir = await adapter.detectSkillDir()
      if (!skillDir) {
        continue
      }

      await adapter.syncSkill(skill, skillDir)
      await this.updateSyncState(skillId, adapter.toolType, skill)
    }
  }

  async syncAllSkillsToTool(toolType: ToolType): Promise<void> {
    const adapter = this.adapters.find((a) => a.toolType === toolType)
    if (!adapter) {
      throw new Error(`Adapter for tool type ${toolType} not found`)
    }

    const isInstalled = await adapter.isInstalled()
    if (!isInstalled) {
      throw new Error(`Tool ${toolType} is not installed`)
    }

    const skillDir = await adapter.detectSkillDir()
    if (!skillDir) {
      throw new Error(`Could not detect skill directory for ${toolType}`)
    }

    const skills = await this.skillRepo.listSkills()
    for (const skill of skills) {
      await adapter.syncSkill(skill, skillDir)
      await this.updateSyncState(skill.id, toolType, skill)
    }
  }

  async syncAllSkillsToAllTools(): Promise<void> {
    const skills = await this.skillRepo.listSkills()

    for (const adapter of this.adapters) {
      const isInstalled = await adapter.isInstalled()
      if (!isInstalled) {
        continue
      }

      const skillDir = await adapter.detectSkillDir()
      if (!skillDir) {
        continue
      }

      for (const skill of skills) {
        await adapter.syncSkill(skill, skillDir)
        await this.updateSyncState(skill.id, adapter.toolType, skill)
      }
    }
  }

  async getSkillSyncStates(skillId: string): Promise<SyncState[]> {
    const allStoredStates = await this.loadSyncStates()
    const storedInfo = allStoredStates.find((s) => s.skillId === skillId)
    const calculatedStates = await this.calculateSyncStates(skillId)

    return calculatedStates.map((state) => {
      const stored = storedInfo?.states.find((s) => s.toolType === state.toolType)
      if (stored) {
        return {
          ...state,
          lastSyncAt: stored.lastSyncAt,
          syncedHash: stored.syncedHash
        }
      }
      return state
    })
  }

  async getAllSkillsSyncStates(): Promise<Map<string, SyncState[]>> {
    const result = new Map<string, SyncState[]>()
    const skills = await this.skillRepo.listSkills()

    for (const skill of skills) {
      const states = await this.getSkillSyncStates(skill.id)
      result.set(skill.id, states)
    }

    return result
  }

  async removeSkillFromTool(skillId: string, toolType: ToolType): Promise<void> {
    const adapter = this.adapters.find((a) => a.toolType === toolType)
    if (!adapter) {
      throw new Error(`Adapter for tool type ${toolType} not found`)
    }

    const isInstalled = await adapter.isInstalled()
    if (!isInstalled) {
      throw new Error(`Tool ${toolType} is not installed`)
    }

    const skillDir = await adapter.detectSkillDir()
    if (!skillDir) {
      throw new Error(`Could not detect skill directory for ${toolType}`)
    }

    await adapter.removeSkill(skillId, skillDir)
    await this.removeSyncState(skillId, toolType)
  }

  private async calculateSyncStates(skillId: string): Promise<SyncState[]> {
    const skill = await this.skillRepo.getSkill(skillId)
    if (!skill) {
      return []
    }

    const states: SyncState[] = []

    for (const adapter of this.adapters) {
      const isInstalled = await adapter.isInstalled()
      if (!isInstalled) {
        states.push({
          toolType: adapter.toolType,
          status: 'unsynced' as SyncStatus
        })
        continue
      }

      const skillDir = await adapter.detectSkillDir()
      if (!skillDir) {
        states.push({
          toolType: adapter.toolType,
          status: 'unsynced' as SyncStatus
        })
        continue
      }

      const status = await adapter.getSkillSyncState(skill, skillDir)
      states.push({
        toolType: adapter.toolType,
        status
      })
    }

    return states
  }

  private async updateSyncState(skillId: string, toolType: ToolType, skill: Skill): Promise<void> {
    const allStates = await this.loadSyncStates()
    const now = Date.now()
    const hash = this.getSkillHashString(skill)

    let skillInfo = allStates.find((s) => s.skillId === skillId)
    if (!skillInfo) {
      skillInfo = { skillId, states: [] }
      allStates.push(skillInfo)
    }

    let state = skillInfo.states.find((s) => s.toolType === toolType)
    if (!state) {
      state = { toolType, status: 'synced' as SyncStatus }
      skillInfo.states.push(state)
    }

    state.status = 'synced' as SyncStatus
    state.lastSyncAt = now
    state.syncedHash = hash

    await this.saveSyncStates(allStates)
  }

  private async removeSyncState(skillId: string, toolType: ToolType): Promise<void> {
    const allStates = await this.loadSyncStates()
    const skillInfo = allStates.find((s) => s.skillId === skillId)

    if (skillInfo) {
      skillInfo.states = skillInfo.states.filter((s) => s.toolType !== toolType)
      if (skillInfo.states.length === 0) {
        const index = allStates.indexOf(skillInfo)
        allStates.splice(index, 1)
      }
    }

    await this.saveSyncStates(allStates)
  }

  private async loadSyncStates(): Promise<SkillSyncInfo[]> {
    try {
      await access(this.syncStatesPath, constants.F_OK)
      const content = await readFile(this.syncStatesPath, 'utf-8')
      return JSON.parse(content) as SkillSyncInfo[]
    } catch {
      return []
    }
  }

  private async saveSyncStates(states: SkillSyncInfo[]): Promise<void> {
    const dir = join(this.skillRepoPath, SYNC_STATES_DIR)
    await mkdir(dir, { recursive: true })
    await writeFile(this.syncStatesPath, JSON.stringify(states, null, 2), 'utf-8')
  }

  private getSkillHashString(skill: Skill): string {
    const sortedTags = [...skill.tags].sort()
    const content = [
      skill.name,
      skill.description,
      skill.content,
      skill.category,
      sortedTags.join(',')
    ].join('|||')

    return createHash('sha256').update(content).digest('hex')
  }
}
