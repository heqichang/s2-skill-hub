import { access, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { BaseAdapter } from './base'
import { ToolType } from '@shared/types/adapter'
import type { Skill } from '@shared/types/skill'

const execAsync = promisify(exec)

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
    const homeDrive = process.env.HOMEDRIVE
    const homePath = process.env.HOMEPATH

    const possiblePaths: string[] = []

    if (appData) {
      possiblePaths.push(
        join(appData, 'Trae', 'skills'),
        join(appData, 'Trae', 'skill'),
        join(appData, 'Trae', 'User', 'skills'),
        join(appData, 'trae', 'skills'),
        join(appData, 'Trae AI', 'skills')
      )
    }

    if (localAppData) {
      possiblePaths.push(
        join(localAppData, 'Trae', 'skills'),
        join(localAppData, 'Trae', 'User', 'skills'),
        join(localAppData, 'Programs', 'Trae', 'resources', 'skills'),
        join(localAppData, 'trae', 'skills')
      )
    }

    if (userProfile) {
      possiblePaths.push(
        join(userProfile, '.trae', 'skills'),
        join(userProfile, '.trae', 'skill'),
        join(userProfile, 'trae', 'skills'),
        join(userProfile, 'Trae', 'skills')
      )
    }

    if (homeDrive && homePath) {
      const homeDir = join(homeDrive, homePath)
      possiblePaths.push(
        join(homeDir, '.trae', 'skills'),
        join(homeDir, 'Trae', 'skills')
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
    const userProfile = process.env.USERPROFILE

    const checkPaths: string[] = []

    if (localAppData) {
      checkPaths.push(
        join(localAppData, 'Programs', 'Trae'),
        join(localAppData, 'Trae')
      )
    }

    if (appData) {
      checkPaths.push(
        join(appData, 'Trae'),
        join(appData, 'Trae AI'),
        join(appData, 'trae')
      )
    }

    if (programFiles) {
      checkPaths.push(
        join(programFiles, 'Trae'),
        join(programFiles, 'Trae AI')
      )
    }

    if (programFilesX86) {
      checkPaths.push(
        join(programFilesX86, 'Trae'),
        join(programFilesX86, 'Trae AI')
      )
    }

    if (userProfile) {
      checkPaths.push(
        join(userProfile, '.trae'),
        join(userProfile, 'AppData', 'Local', 'Programs', 'trae')
      )
    }

    for (const dirPath of checkPaths) {
      try {
        await access(dirPath)
        const files = await readdir(dirPath)
        const hasExe = files.some((f) => f.toLowerCase().endsWith('.exe'))
        if (hasExe) {
          return true
        }
      } catch {
        // continue to next path
      }
    }

    try {
      const { stdout } = await execAsync('where trae 2>nul', { windowsHide: true })
      if (stdout.trim()) {
        return true
      }
    } catch {
      // command not found, ignore
    }

    return false
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
