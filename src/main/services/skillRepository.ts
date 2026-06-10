import { mkdir, readdir, readFile, writeFile, rm, access, constants } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Skill, SkillMetadata } from '@shared/types/skill'

const SKILLS_DIR = 'skills'
const METADATA_FILE = 'skill.json'
const CONTENT_FILE = 'content.md'

export class SkillRepositoryService {
  private repoPath: string
  private skillsPath: string

  constructor(repoPath: string) {
    this.repoPath = repoPath
    this.skillsPath = join(repoPath, SKILLS_DIR)
  }

  async init(): Promise<void> {
    try {
      await access(this.repoPath, constants.F_OK)
    } catch {
      await mkdir(this.repoPath, { recursive: true })
    }
    await mkdir(this.skillsPath, { recursive: true })
  }

  async isInitialized(): Promise<boolean> {
    try {
      await access(this.skillsPath, constants.F_OK)
      return true
    } catch {
      return false
    }
  }

  async listSkills(): Promise<Skill[]> {
    try {
      const entries = await readdir(this.skillsPath, { withFileTypes: true })
      const skillDirs = entries.filter((e) => e.isDirectory())

      const skills: Skill[] = []
      for (const dir of skillDirs) {
        const skill = await this.getSkill(dir.name)
        if (skill) {
          skills.push(skill)
        }
      }

      return skills.sort((a, b) => b.updatedAt - a.updatedAt)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return []
      }
      throw error
    }
  }

  async getSkill(id: string): Promise<Skill | null> {
    try {
      const skillDir = join(this.skillsPath, id)
      const metadataPath = join(skillDir, METADATA_FILE)
      const contentPath = join(skillDir, CONTENT_FILE)

      const [metadataRaw, content] = await Promise.all([
        readFile(metadataPath, 'utf-8'),
        readFile(contentPath, 'utf-8')
      ])

      const metadata = JSON.parse(metadataRaw) as SkillMetadata
      return {
        ...metadata,
        tags: metadata.tags || [],
        content
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      throw error
    }
  }

  async createSkill(data: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>): Promise<Skill> {
    const now = Date.now()
    const id = randomUUID()
    const skill: Skill = {
      ...data,
      tags: data.tags || [],
      id,
      createdAt: now,
      updatedAt: now
    }

    const skillDir = join(this.skillsPath, id)
    await mkdir(skillDir, { recursive: true })

    const metadata: SkillMetadata = {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      category: skill.category,
      tags: skill.tags,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt
    }

    const metadataPath = join(skillDir, METADATA_FILE)
    const contentPath = join(skillDir, CONTENT_FILE)

    await Promise.all([
      writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8'),
      writeFile(contentPath, skill.content, 'utf-8')
    ])

    return skill
  }

  async updateSkill(id: string, data: Partial<Omit<Skill, 'id' | 'createdAt'>>): Promise<Skill> {
    const existing = await this.getSkill(id)
    if (!existing) {
      throw new Error(`Skill with id ${id} not found`)
    }

    const updated: Skill = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: Date.now()
    }

    const skillDir = join(this.skillsPath, id)
    const metadata: SkillMetadata = {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      category: updated.category,
      tags: updated.tags,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    }

    const metadataPath = join(skillDir, METADATA_FILE)
    const contentPath = join(skillDir, CONTENT_FILE)

    await Promise.all([
      writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8'),
      writeFile(contentPath, updated.content, 'utf-8')
    ])

    return updated
  }

  async deleteSkill(id: string): Promise<void> {
    const skillDir = join(this.skillsPath, id)
    try {
      await rm(skillDir, { recursive: true, force: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }

  async searchSkills(query: string): Promise<Skill[]> {
    if (!query.trim()) {
      return this.listSkills()
    }

    const lowerQuery = query.toLowerCase()
    const allSkills = await this.listSkills()

    return allSkills.filter((skill) => {
      const nameMatch = skill.name.toLowerCase().includes(lowerQuery)
      const descMatch = skill.description.toLowerCase().includes(lowerQuery)
      const contentMatch = skill.content.toLowerCase().includes(lowerQuery)
      const tagMatch = skill.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      return nameMatch || descMatch || contentMatch || tagMatch
    })
  }
}
