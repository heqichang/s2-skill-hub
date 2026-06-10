import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { MockAdapter } from './mock'
import type { Skill } from '@shared/types/skill'
import { ToolType } from '@shared/types/adapter'

describe('MockAdapter', () => {
  let tempDir: string
  let adapter: MockAdapter

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'mock-adapter-test-'))
    adapter = new MockAdapter(true, tempDir)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('toolType', () => {
    it('should return TRAE tool type', () => {
      expect(adapter.toolType).toBe(ToolType.TRAE)
    })
  })

  describe('toolName', () => {
    it('should return Mock Tool name', () => {
      expect(adapter.toolName).toBe('Mock Tool')
    })
  })

  describe('isInstalled', () => {
    it('should return true when installed', async () => {
      const result = await adapter.isInstalled()
      expect(result).toBe(true)
    })

    it('should return false when not installed', async () => {
      adapter.setInstalled(false)
      const result = await adapter.isInstalled()
      expect(result).toBe(false)
    })
  })

  describe('detectSkillDir', () => {
    it('should return the configured skill dir', async () => {
      const result = await adapter.detectSkillDir()
      expect(result).toBe(tempDir)
    })

    it('should return null when no skill dir configured', async () => {
      adapter.setSkillDir(null)
      const result = await adapter.detectSkillDir()
      expect(result).toBeNull()
    })
  })

  describe('convertSkill', () => {
    it('should convert skill to files', async () => {
      const skill: Skill = {
        id: 'test-skill-id',
        name: 'Test Skill',
        description: 'A test skill description',
        content: '# Test Content\n\nThis is test content.',
        category: 'testing',
        tags: ['test', 'example'],
        createdAt: 1234567890,
        updatedAt: 1234567890
      }

      const result = await adapter.convertSkill(skill)

      expect(result.files).toHaveLength(2)

      const skillJsonFile = result.files.find((f) => f.path === 'skill.json')
      expect(skillJsonFile).toBeDefined()

      const metadata = JSON.parse(skillJsonFile!.content)
      expect(metadata.id).toBe(skill.id)
      expect(metadata.name).toBe(skill.name)
      expect(metadata.description).toBe(skill.description)
      expect(metadata.category).toBe(skill.category)
      expect(metadata.tags).toEqual(skill.tags)
      expect(metadata.createdAt).toBe(skill.createdAt)
      expect(metadata.updatedAt).toBe(skill.updatedAt)

      const contentFile = result.files.find((f) => f.path === 'content.md')
      expect(contentFile).toBeDefined()
      expect(contentFile!.content).toBe(skill.content)
    })
  })

  describe('syncSkill', () => {
    it('should sync skill to target directory', async () => {
      const skill: Skill = {
        id: 'test-skill-id',
        name: 'Test Skill',
        description: 'A test skill',
        content: '# Test',
        category: 'test',
        tags: ['test'],
        createdAt: 123,
        updatedAt: 456
      }

      const targetDir = join(tempDir, 'skills')
      await adapter.syncSkill(skill, targetDir)

      const skillDir = join(targetDir, skill.id)
      const skillJsonPath = join(skillDir, 'skill.json')
      const contentPath = join(skillDir, 'content.md')
      const hashPath = join(skillDir, '.skill-hash')

      const skillJsonExists = await access(skillJsonPath)
        .then(() => true)
        .catch(() => false)
      const contentExists = await access(contentPath)
        .then(() => true)
        .catch(() => false)
      const hashExists = await access(hashPath)
        .then(() => true)
        .catch(() => false)

      expect(skillJsonExists).toBe(true)
      expect(contentExists).toBe(true)
      expect(hashExists).toBe(true)

      const skillJsonContent = await readFile(skillJsonPath, 'utf-8')
      const metadata = JSON.parse(skillJsonContent)
      expect(metadata.name).toBe(skill.name)

      const content = await readFile(contentPath, 'utf-8')
      expect(content).toBe(skill.content)
    })
  })

  describe('setInstalled', () => {
    it('should change installed status', async () => {
      expect(await adapter.isInstalled()).toBe(true)
      adapter.setInstalled(false)
      expect(await adapter.isInstalled()).toBe(false)
      adapter.setInstalled(true)
      expect(await adapter.isInstalled()).toBe(true)
    })
  })

  describe('setSkillDir', () => {
    it('should change skill directory', async () => {
      expect(await adapter.detectSkillDir()).toBe(tempDir)
      adapter.setSkillDir(null)
      expect(await adapter.detectSkillDir()).toBeNull()

      const newDir = join(tempDir, 'new-skills')
      adapter.setSkillDir(newDir)
      expect(await adapter.detectSkillDir()).toBe(newDir)
    })
  })
})
