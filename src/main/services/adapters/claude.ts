import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { BaseAdapter } from './base'
import { ToolType } from '@shared/types/adapter'
import type { Skill } from '@shared/types/skill'

const execAsync = promisify(exec)

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
        join(appData, 'Claude', 'skills'),
        join(appData, 'Claude Desktop', 'skills')
      )
    }

    if (localAppData) {
      possiblePaths.push(
        join(localAppData, 'Claude', 'skills'),
        join(localAppData, 'Claude Desktop', 'skills'),
        join(localAppData, 'Programs', 'Claude', 'resources', 'skills')
      )
    }

    if (userProfile) {
      possiblePaths.push(
        join(userProfile, '.claude', 'skills'),
        join(userProfile, 'Claude', 'skills')
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
    const localAppData = process.env.LOCALAPPDATA
    const programFiles = process.env.PROGRAMFILES
    const programFilesX86 = process.env['PROGRAMFILES(X86)']
    const appData = process.env.APPDATA

    const exeCheckPaths: string[] = []

    if (localAppData) {
      exeCheckPaths.push(
        join(localAppData, 'Programs', 'Claude', 'Claude.exe'),
        join(localAppData, 'Programs', 'Claude', 'claude.exe'),
        join(localAppData, 'Claude', 'Claude.exe'),
        join(localAppData, 'Claude Desktop', 'Claude.exe')
      )
    }

    if (programFiles) {
      exeCheckPaths.push(
        join(programFiles, 'Claude', 'Claude.exe'),
        join(programFiles, 'Claude Desktop', 'Claude.exe')
      )
    }

    if (programFilesX86) {
      exeCheckPaths.push(
        join(programFilesX86, 'Claude', 'Claude.exe'),
        join(programFilesX86, 'Claude Desktop', 'Claude.exe')
      )
    }

    for (const exePath of exeCheckPaths) {
      try {
        await access(exePath)
        return true
      } catch {
        // continue to next path
      }
    }

    try {
      const { stdout } = await execAsync('where claude 2>nul', { windowsHide: true })
      if (stdout.trim()) {
        return true
      }
    } catch {
      // command not found, ignore
    }

    if (appData) {
      try {
        const settingsPath = join(appData, 'Claude', 'settings.json')
        await access(settingsPath)
        return true
      } catch {
        // ignore
      }
    }

    return false
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
