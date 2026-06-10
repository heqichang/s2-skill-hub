import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { BaseAdapter } from './base'
import { ToolType } from '@shared/types/adapter'
import type { Skill } from '@shared/types/skill'

const execAsync = promisify(exec)

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
      try {
        await access(this.skillDirPath)
        return this.skillDirPath
      } catch {
        // 配置的路径不存在，继续自动检测
      }
    }

    const appData = process.env.APPDATA
    const localAppData = process.env.LOCALAPPDATA
    const userProfile = process.env.USERPROFILE

    const possiblePaths: string[] = []

    if (appData) {
      possiblePaths.push(
        join(appData, 'Cursor', 'User', 'skills'),
        join(appData, 'Cursor', 'User', 'globalSkills'),
        join(appData, 'Cursor', 'skills'),
        join(appData, 'Cursor User', 'skills')
      )
    }

    if (localAppData) {
      possiblePaths.push(
        join(localAppData, 'Cursor', 'User', 'skills'),
        join(localAppData, 'Programs', 'Cursor', 'resources', 'skills')
      )
    }

    if (userProfile) {
      possiblePaths.push(
        join(userProfile, '.cursor', 'skills'),
        join(userProfile, '.cursor-rules'),
        join(userProfile, 'Cursor', 'skills')
      )
    }

    for (const dirPath of possiblePaths) {
      try {
        await access(dirPath)
        return dirPath
      } catch {
        // continue to next path
      }
    }

    return null
  }

  async isInstalled(): Promise<boolean> {
    const appData = process.env.APPDATA
    const localAppData = process.env.LOCALAPPDATA
    const programFiles = process.env.PROGRAMFILES
    const programFilesX86 = process.env['PROGRAMFILES(X86)']

    const checkPaths: string[] = []

    if (localAppData) {
      checkPaths.push(
        join(localAppData, 'Programs', 'Cursor'),
        join(localAppData, 'Cursor')
      )
    }

    if (appData) {
      checkPaths.push(
        join(appData, 'Cursor'),
        join(appData, 'Cursor User')
      )
    }

    if (programFiles) {
      checkPaths.push(join(programFiles, 'Cursor'))
    }

    if (programFilesX86) {
      checkPaths.push(join(programFilesX86, 'Cursor'))
    }

    for (const dirPath of checkPaths) {
      try {
        const exePath = join(dirPath, 'Cursor.exe')
        await access(exePath)
        return true
      } catch {
        // continue to next path
      }
    }

    try {
      const { stdout } = await execAsync('where cursor 2>nul', { windowsHide: true })
      if (stdout.trim()) {
        return true
      }
    } catch {
      // command not found, ignore
    }

    return false
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
