import { createHash } from 'node:crypto'
import { mkdir, writeFile, readFile, rm, access, constants } from 'node:fs/promises'
import { join } from 'node:path'
import type { Skill, SyncStatus } from '@shared/types/skill'
import type { ToolType } from '@shared/types/adapter'

const HASH_ALGORITHM = 'sha256'
const HASH_FILE = '.skill-hash'

export abstract class BaseAdapter {
  abstract get toolType(): ToolType
  abstract get toolName(): string

  abstract detectSkillDir(): Promise<string | null>
  abstract isInstalled(): Promise<boolean>
  abstract convertSkill(skill: Skill): Promise<{ files: Array<{ path: string; content: string }> }>

  async syncSkill(skill: Skill, targetDir: string): Promise<void> {
    const { files } = await this.convertSkill(skill)
    const skillDir = join(targetDir, skill.id)

    await mkdir(skillDir, { recursive: true })

    for (const file of files) {
      const filePath = join(skillDir, file.path)
      const fileDir = join(filePath, '..')
      await mkdir(fileDir, { recursive: true })
      await writeFile(filePath, file.content, 'utf-8')
    }

    const hash = this.getSkillHash(skill)
    const hashFilePath = join(skillDir, HASH_FILE)
    await writeFile(hashFilePath, hash, 'utf-8')
  }

  async getSkillSyncState(skill: Skill, targetDir: string): Promise<SyncStatus> {
    const skillDir = join(targetDir, skill.id)
    const hashFilePath = join(skillDir, HASH_FILE)

    try {
      await access(skillDir, constants.F_OK)
    } catch {
      return 'unsynced' as SyncStatus
    }

    try {
      const storedHash = await readFile(hashFilePath, 'utf-8')
      const currentHash = this.getSkillHash(skill)

      if (storedHash === currentHash) {
        return 'synced' as SyncStatus
      } else {
        return 'modified' as SyncStatus
      }
    } catch {
      return 'modified' as SyncStatus
    }
  }

  async removeSkill(skillId: string, targetDir: string): Promise<void> {
    const skillDir = join(targetDir, skillId)
    try {
      await rm(skillDir, { recursive: true, force: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  protected getSkillHash(skill: Skill): string {
    const sortedTags = [...skill.tags].sort()
    const content = [
      skill.name,
      skill.description,
      skill.content,
      skill.category,
      sortedTags.join(',')
    ].join('|||')

    return createHash(HASH_ALGORITHM).update(content).digest('hex')
  }
}
