import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ClaudeAdapter } from './claude'
import type { Skill, SyncStatus } from '@shared/types/skill'
import { ToolType } from '@shared/types/adapter'

describe('ClaudeAdapter', () => {
  let tempDir: string
  let adapter: ClaudeAdapter

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claude-adapter-test-'))
    adapter = new ClaudeAdapter(tempDir)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('toolType', () => {
    it('should return CLAUDE tool type', () => {
      expect(adapter.toolType).toBe(ToolType.CLAUDE)
    })
  })

  describe('toolName', () => {
    it('should return Claude Desktop name', () => {
      expect(adapter.toolName).toBe('Claude Desktop')
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

      const adapterWithoutConfig = new ClaudeAdapter()
      const result = await adapterWithoutConfig.detectSkillDir()
      expect(result).toBeNull()

      process.env.APPDATA = originalAppData
    })

    it('should return null when skills directory does not exist', async () => {
      const originalAppData = process.env.APPDATA
      process.env.APPDATA = tempDir

      const adapterWithoutConfig = new ClaudeAdapter()
      const result = await adapterWithoutConfig.detectSkillDir()
      expect(result).toBeNull()

      process.env.APPDATA = originalAppData
    })

    it('should detect skills directory when it exists', async () => {
      const originalAppData = process.env.APPDATA
      process.env.APPDATA = tempDir

      const claudeSkillsDir = join(tempDir, 'Claude', 'skills')
      await mkdir(claudeSkillsDir, { recursive: true })

      const adapterWithoutConfig = new ClaudeAdapter()
      const result = await adapterWithoutConfig.detectSkillDir()
      expect(result).toBe(claudeSkillsDir)

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

    it('should return false when Claude directory does not exist', async () => {
      const originalAppData = process.env.APPDATA
      process.env.APPDATA = tempDir

      const result = await adapter.isInstalled()
      expect(result).toBe(false)

      process.env.APPDATA = originalAppData
    })

    it('should return true when Claude directory exists', async () => {
      const originalAppData = process.env.APPDATA
      process.env.APPDATA = tempDir

      const claudeDir = join(tempDir, 'Claude')
      await mkdir(claudeDir, { recursive: true })

      const result = await adapter.isInstalled()
      expect(result).toBe(true)

      process.env.APPDATA = originalAppData
    })
  })

  describe('convertSkill', () => {
    it('should convert skill to a single markdown file', async () => {
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

      expect(result.files).toHaveLength(1)

      const mdFile = result.files.find((f) => f.path === 'skill.md')
      expect(mdFile).toBeDefined()
      expect(mdFile!.content).toBe(skill.content)
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
      const skillMdPath = join(skillDir, 'skill.md')
      const hashPath = join(skillDir, '.skill-hash')

      const mdContent = await readFile(skillMdPath, 'utf-8')
      expect(mdContent).toBe(skill.content)

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
