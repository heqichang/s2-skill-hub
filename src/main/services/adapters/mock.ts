import { BaseAdapter } from './base'
import { ToolType } from '@shared/types/adapter'
import type { Skill } from '@shared/types/skill'

export class MockAdapter extends BaseAdapter {
  private installed: boolean
  private skillDir: string | null

  constructor(installed = true, skillDir: string | null = null) {
    super()
    this.installed = installed
    this.skillDir = skillDir
  }

  get toolType(): ToolType {
    return ToolType.TRAE
  }

  get toolName(): string {
    return 'Mock Tool'
  }

  async detectSkillDir(): Promise<string | null> {
    return this.skillDir
  }

  async isInstalled(): Promise<boolean> {
    return this.installed
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

  setInstalled(installed: boolean): void {
    this.installed = installed
  }

  setSkillDir(skillDir: string | null): void {
    this.skillDir = skillDir
  }
}
