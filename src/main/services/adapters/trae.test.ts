import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { TraeAdapter } from './trae'
import type { Skill, SyncStatus } from '@shared/types/skill'
import { ToolType } from '@shared/types/adapter'

describe('TraeAdapter', () => {
  let tempDir: string
  let adapter: TraeAdapter

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'trae-adapter-test-'))
    adapter = new TraeAdapter(tempDir)
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
    it('should return Trae name', () => {
      expect(adapter.toolName).toBe('Trae')
    })
  })

  describe('detectSkillDir', () => {
    it('should return the configured skill dir when provided', async () => {
      const result = await adapter.detectSkillDir()
      expect(result).toBe(tempDir)
    })

    it('should return null when no skill dir configured and APPDATA not set', async () => {
      const originalAppData = process.env.APPDATA
      delete process.env.APPDATA

      const adapterWithoutConfig = new TraeAdapter()
      const result = await adapterWithoutConfig.detectSkillDir()
      expect(result).toBeNull()

      process.env.APPDATA = originalAppData
    })

    it('should return null when skills directory does not exist', async () => {
      const originalAppData = process.env.APPDATA
      process.env.APPDATA = tempDir

      const adapterWithoutConfig = new TraeAdapter()
      const result = await adapterWithoutConfig.detectSkillDir()
      expect(result).toBeNull()

      process.env.APPDATA = originalAppData
    })

    it('should detect skills directory when it exists', async () => {
      const originalAppData = process.env.APPDATA
      process.env.APPDATA = tempDir

      const traeSkillsDir = join(tempDir, 'Trae', 'skills')
      await mkdir(traeSkillsDir, { recursive: true })

      const adapterWithoutConfig = new TraeAdapter()
      const result = await adapterWithoutConfig.detectSkillDir()
      expect(result).toBe(traeSkillsDir)

      process.env.APPDATA = originalAppData
    })
  })

  describe('isInstalled', () => {
    it('should return false when APPDATA is not set', async () => {
      const originalAppData = process.env.APPDATA
      delete process.env.APPDATA

      const result = await adapter.isInstalled()
      expect(result).toBe(false)

      process.env.APPDATA = originalAppData
    })

    it('should return false when Trae directory does not exist', async () => {
      const originalAppData = process.env.APPDATA
      process.env.APPDATA = tempDir

      const result = await adapter.isInstalled()
      expect(result).toBe(false)

      process.env.APPDATA = originalAppData
    })

    it('should return true when Trae directory exists', async () => {
      const originalAppData = process.env.APPDATA
      process.env.APPDATA = tempDir

      const traeDir = join(tempDir, 'Trae')
      await mkdir(traeDir, { recursive: true })

      const result = await adapter.isInstalled()
      expect(result).toBe(true)

      process.env.APPDATA = originalAppData
    })
  })

  describe('convertSkill', () => {
    it('should convert skill to skill.json and content.md files', async () => {
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

      const skillJsonContent = await readFile(skillJsonPath, 'utf-8')
      const metadata = JSON.parse(skillJsonContent)
      expect(metadata.name).toBe(skill.name)

      const content = await readFile(contentPath, 'utf-8')
      expect(content).toBe(skill.content)

      const hashContent = await readFile(hashPath, 'utf-8')
      expect(hashContent).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('getSkillSyncState', () => {
    it('should return unsynced for non-existent skill', async () => {
      const skill: Skill = {
        id: 'non-existent',
        name: 'Test',
        description: 'Test',
        content: 'Test',
        category: 'test',
        tags: ['test'],
        createdAt: 123,
        updatedAt: 456
      }

      const status = await adapter.getSkillSyncState(skill, tempDir)
      expect(status).toBe('unsynced' as SyncStatus)
    })

    it('should return synced after syncing', async () => {
      const skill: Skill = {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'Test desc',
        content: 'Test content',
        category: 'test',
        tags: ['test'],
        createdAt: 123,
        updatedAt: 456
      }

      const targetDir = join(tempDir, 'skills')
      await adapter.syncSkill(skill, targetDir)

      const status = await adapter.getSkillSyncState(skill, targetDir)
      expect(status).toBe('synced' as SyncStatus)
    })

    it('should return modified when skill content changes', async () => {
      const skill: Skill = {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'Test desc',
        content: 'Original content',
        category: 'test',
        tags: ['test'],
        createdAt: 123,
        updatedAt: 456
      }

      const targetDir = join(tempDir, 'skills')
      await adapter.syncSkill(skill, targetDir)

      const modifiedSkill: Skill = {
        ...skill,
        content: 'Modified content'
      }

      const status = await adapter.getSkillSyncState(modifiedSkill, targetDir)
      expect(status).toBe('modified' as SyncStatus)
    })
  })
})
