import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { BaseAdapter } from './base'
import { ToolType } from '@shared/types/adapter'
import type { Skill } from '@shared/types/skill'

export class ClaudeAdapter extends BaseAdapter {
  private skillDirPath: string | null

  constructor(skillDirPath: string | null = null) {
    super()
    this.skillDirPath = skillDirPath
  }

  get toolType(): ToolType {
    return ToolType.CLAUDE
  }

  get toolName(): string {
    return 'Claude Desktop'
  }

  async detectSkillDir(): Promise<string | null> {
    if (this.skillDirPath) {
      return this.skillDirPath
    }

    const appData = process.env.APPDATA
    if (!appData) {
      return null
    }

    const skillsDir = join(appData, 'Claude', 'skills')
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

    const claudeDir = join(appData, 'Claude')
    try {
      await access(claudeDir)
      return true
    } catch {
      return false
    }
  }

  async convertSkill(skill: Skill): Promise<{ files: Array<{ path: string; content: string }> }> {
    return {
      files: [
        {
          path: 'skill.md',
          content: skill.content
        }
      ]
    }
  }
}
