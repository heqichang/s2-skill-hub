import { SyncStatus } from './skill'

export enum ToolType {
  CLAUDE = 'claude',
  CURSOR = 'cursor',
  TRAE = 'trae'
}

export interface ToolInfo {
  type: ToolType
  name: string
  icon?: string
  description: string
  isInstalled: boolean
  skillDirPath: string | null
}

export interface SyncState {
  toolType: ToolType
  status: SyncStatus
  lastSyncAt?: number
  syncedHash?: string
}

export interface SkillSyncInfo {
  skillId: string
  states: SyncState[]
}

export interface AdapterConfig {
  toolType: ToolType
  skillDirPath: string
}
