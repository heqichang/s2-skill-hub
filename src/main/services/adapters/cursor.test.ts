import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { CursorAdapter } from './cursor'
import type { Skill, SyncStatus } from '@shared/types/skill'
import { ToolType } from '@shared/types/adapter'

describe('CursorAdapter', () => {
  let tempDir: string
  let adapter: CursorAdapter

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cursor-adapter-test-'))
    adapter = new CursorAdapter(tempDir)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('toolType', () => {
    it('should return CURSOR tool type', () => {
      expect(adapter.toolType).toBe(ToolType.CURSOR)
    })
  })

  describe('toolName', () => {
    it('should return Cursor name', () => {
      expect(adapter.toolName).toBe('Cursor')
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

      const adapterWithoutConfig = new CursorAdapter()
      const result = await adapterWithoutConfig.detectSkillDir()
      expect(result).toBeNull()

      process.env.APPDATA = originalAppData
    })

    it('should return null when skills directory does not exist', async () => {
      const originalAppData = process.env.APPDATA
      process.env.APPDATA = tempDir

      const adapterWithoutConfig = new CursorAdapter()
      const result = await adapterWithoutConfig.detectSkillDir()
      expect(result).toBeNull()

      process.env.APPDATA = originalAppData
    })

    it('should detect skills directory when it exists', async () => {
      const originalAppData = process.env.APPDATA
      process.env.APPDATA = tempDir

      const cursorSkillsDir = join(tempDir, 'Cursor', 'User', 'skills')
      await mkdir(cursorSkillsDir, { recursive: true })

      const adapterWithoutConfig = new CursorAdapter()
      const result = await adapterWithoutConfig.detectSkillDir()
      expect(result).toBe(cursorSkillsDir)

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

    it('should return false when Cursor directory does not exist', async () => {
      const originalAppData = process.env.APPDATA
      process.env.APPDATA = tempDir

      const result = await adapter.isInstalled()
      expect(result).toBe(false)

      process.env.APPDATA = originalAppData
    })

    it('should return true when Cursor executable exists', async () => {
      const originalLocalAppData = process.env.LOCALAPPDATA
      process.env.LOCALAPPDATA = tempDir

      const cursorDir = join(tempDir, 'Programs', 'Cursor')
      await mkdir(cursorDir, { recursive: true })
      const { writeFile } = await import('node:fs/promises')
      await writeFile(join(cursorDir, 'Cursor.exe'), '')

      const result = await adapter.isInstalled()
      expect(result).toBe(true)

      process.env.LOCALAPPDATA = originalLocalAppData
    })
  })

  describe('convertSkill', () => {
    it('should convert skill to markdown with YAML front matter', async () => {
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

      const mdFile = result.files.find((f) => f.path === `${skill.id}.md`)
      expect(mdFile).toBeDefined()

      const content = mdFile!.content

      expect(content).toContain('---')
      expect(content).toContain(`name: ${skill.name}`)
      expect(content).toContain(`description: ${skill.description}`)
      expect(content).toContain(`category: ${skill.category}`)
      expect(content).toContain('tags:')
      expect(content).toContain(`  - ${skill.tags[0]}`)
      expect(content).toContain(`  - ${skill.tags[1]}`)
      expect(content).toContain(skill.content)

      const parts = content.split('---')
      expect(parts.length).toBeGreaterThanOrEqual(3)
    })

    it('should handle skill without tags', async () => {
      const skill: Skill = {
        id: 'no-tags-skill',
        name: 'No Tags Skill',
        description: 'A skill without tags',
        content: '# No Tags',
        category: 'testing',
        tags: [],
        createdAt: 123,
        updatedAt: 456
      }

      const result = await adapter.convertSkill(skill)
      const content = result.files[0].content

      expect(content).toContain(`name: ${skill.name}`)
      expect(content).not.toContain('tags:')
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
      const skillMdPath = join(skillDir, `${skill.id}.md`)
      const hashPath = join(skillDir, '.skill-hash')

      const mdContent = await readFile(skillMdPath, 'utf-8')
      expect(mdContent).toContain(skill.content)
      expect(mdContent).toContain(`name: ${skill.name}`)

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
