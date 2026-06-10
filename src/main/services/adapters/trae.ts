import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { BaseAdapter } from './base'
import { ToolType } from '@shared/types/adapter'
import type { Skill } from '@shared/types/skill'

export class TraeAdapter extends BaseAdapter {
  private skillDirPath: string | null

  constructor(skillDirPath: string | null = null) {
    super()
    this.skillDirPath = skillDirPath
  }

  get toolType(): ToolType {
    return ToolType.TRAE
  }

  get toolName(): string {
    return 'Trae'
  }

  async detectSkillDir(): Promise<string | null> {
    if (this.skillDirPath) {
      return this.skillDirPath
    }

    const appData = process.env.APPDATA
    if (!appData) {
      return null
    }

    const skillsDir = join(appData, 'Trae', 'skills')
    try {
      await access(skillsDir)
      return skillsDir
    } catch {
      return null
    }
  }

  async isInstalled(): Promise<boolean> {
    const appData = process.env.APPDATA
    if (!appData) {
      return false
    }

    const traeDir = join(appData, 'Trae')
    try {
      await access(traeDir)
      return true
    } catch {
      return false
    }
  }

  async convertSkill(skill: Skill): Promise<{ files: Array<{ path: string; content: string }> }> {
    const metadata = {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      category: skill.category,
      tags: skill.tags,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt
    }

    return {
      files: [
        {
          path: 'skill.json',
          content: JSON.stringify(metadata, null, 2)
        },
        {
          path: 'content.md',
          content: skill.content
        }
      ]
    }
  }
}
