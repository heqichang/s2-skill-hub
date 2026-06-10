export interface Skill {
  id: string
  name: string
  description: string
  content: string
  category: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export interface Category {
  id: string
  name: string
  color?: string
}

export enum SyncStatus {
  UNSYNCED = 'unsynced',
  SYNCED = 'synced',
  MODIFIED = 'modified'
}

export interface SkillRepositoryConfig {
  path: string
}

export interface SkillMetadata extends Omit<Skill, 'content'> {}
