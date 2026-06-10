import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { BaseAdapter } from './base'
import { ToolType } from '@shared/types/adapter'
import type { Skill } from '@shared/types/skill'

export class CursorAdapter extends BaseAdapter {
  private skillDirPath: string | null

  constructor(skillDirPath: string | null = null) {
    super()
    this.skillDirPath = skillDirPath
  }

  get toolType(): ToolType {
    return ToolType.CURSOR
  }

  get toolName(): string {
    return 'Cursor'
  }

  async detectSkillDir(): Promise<string | null> {
    if (this.skillDirPath) {
      return this.skillDirPath
    }

    const appData = process.env.APPDATA
    if (!appData) {
      return null
    }

    const skillsDir = join(appData, 'Cursor', 'User', 'skills')
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

    const cursorDir = join(appData, 'Cursor')
    try {
      await access(cursorDir)
      return true
    } catch {
      return false
    }
  }

  async convertSkill(skill: Skill): Promise<{ files: Array<{ path: string; content: string }> }> {
    const frontMatter = this.buildFrontMatter(skill)
    const content = `---\n${frontMatter}---\n\n${skill.content}`

    return {
      files: [
        {
          path: `${skill.id}.md`,
          content
        }
      ]
    }
  }

  private buildFrontMatter(skill: Skill): string {
    const lines: string[] = []

    lines.push(`name: ${skill.name}`)
    lines.push(`description: ${skill.description}`)
    lines.push(`category: ${skill.category}`)

    if (skill.tags.length > 0) {
      lines.push('tags:')
      for (const tag of skill.tags) {
        lines.push(`  - ${tag}`)
      }
    }

    return lines.join('\n') + '\n'
  }
}
