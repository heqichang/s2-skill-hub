import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { BaseAdapter } from './base'
import type { Skill, SyncStatus } from '@shared/types/skill'
import type { ToolType } from '@shared/types/adapter'

class TestAdapter extends BaseAdapter {
  get toolType(): ToolType {
    return 'trae' as ToolType
  }

  get toolName(): string {
    return 'Test Tool'
  }

  async detectSkillDir(): Promise<string | null> {
    return null
  }

  async isInstalled(): Promise<boolean> {
    return true
  }

  async convertSkill(skill: Skill): Promise<{ files: Array<{ path: string; content: string }> }> {
    return {
      files: [{ path: 'test.txt', content: skill.name }]
    }
  }

  public getSkillHashPublic(skill: Skill): string {
    return this.getSkillHash(skill)
  }
}

describe('BaseAdapter', () => {
  describe('getSkillHash', () => {
    const adapter = new TestAdapter()

    it('should generate consistent hash for same skill', () => {
      const skill: Skill = {
        id: 'test-id',
        name: 'Test Skill',
        description: 'A test skill',
        content: 'Test content',
        category: 'testing',
        tags: ['b', 'a', 'c'],
        createdAt: 1234567890,
        updatedAt: 1234567890
      }

      const hash1 = adapter.getSkillHashPublic(skill)
      const hash2 = adapter.getSkillHashPublic(skill)

      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should generate different hashes for different skills', () => {
      const skill1: Skill = {
        id: 'test-id-1',
        name: 'Skill 1',
        description: 'Description 1',
        content: 'Content 1',
        category: 'cat1',
        tags: ['tag1'],
        createdAt: 123,
        updatedAt: 456
      }

      const skill2: Skill = {
        id: 'test-id-2',
        name: 'Skill 2',
        description: 'Description 2',
        content: 'Content 2',
        category: 'cat2',
        tags: ['tag2'],
        createdAt: 789,
        updatedAt: 101
      }

      const hash1 = adapter.getSkillHashPublic(skill1)
      const hash2 = adapter.getSkillHashPublic(skill2)

      expect(hash1).not.toBe(hash2)
    })

    it('should sort tags before hashing', () => {
      const skill1: Skill = {
        id: 'test-id',
        name: 'Test Skill',
        description: 'Description',
        content: 'Content',
        category: 'cat',
        tags: ['a', 'b', 'c'],
        createdAt: 123,
        updatedAt: 456
      }

      const skill2: Skill = {
        ...skill1,
        tags: ['c', 'a', 'b']
      }

      const hash1 = adapter.getSkillHashPublic(skill1)
      const hash2 = adapter.getSkillHashPublic(skill2)

      expect(hash1).toBe(hash2)
    })

    it('should include name in hash', () => {
      const skill1: Skill = {
        id: 'test-id',
        name: 'Name 1',
        description: 'Description',
        content: 'Content',
        category: 'cat',
        tags: ['tag'],
        createdAt: 123,
        updatedAt: 456
      }

      const skill2: Skill = {
        ...skill1,
        name: 'Name 2'
      }

      const hash1 = adapter.getSkillHashPublic(skill1)
      const hash2 = adapter.getSkillHashPublic(skill2)

      expect(hash1).not.toBe(hash2)
    })

    it('should include description in hash', () => {
      const skill1: Skill = {
        id: 'test-id',
        name: 'Name',
        description: 'Desc 1',
        content: 'Content',
        category: 'cat',
        tags: ['tag'],
        createdAt: 123,
        updatedAt: 456
      }

      const skill2: Skill = {
        ...skill1,
        description: 'Desc 2'
      }

      const hash1 = adapter.getSkillHashPublic(skill1)
      const hash2 = adapter.getSkillHashPublic(skill2)

      expect(hash1).not.toBe(hash2)
    })

    it('should include content in hash', () => {
      const skill1: Skill = {
        id: 'test-id',
        name: 'Name',
        description: 'Description',
        content: 'Content 1',
        category: 'cat',
        tags: ['tag'],
        createdAt: 123,
        updatedAt: 456
      }

      const skill2: Skill = {
        ...skill1,
        content: 'Content 2'
      }

      const hash1 = adapter.getSkillHashPublic(skill1)
      const hash2 = adapter.getSkillHashPublic(skill2)

      expect(hash1).not.toBe(hash2)
    })

    it('should include category in hash', () => {
      const skill1: Skill = {
        id: 'test-id',
        name: 'Name',
        description: 'Description',
        content: 'Content',
        category: 'cat1',
        tags: ['tag'],
        createdAt: 123,
        updatedAt: 456
      }

      const skill2: Skill = {
        ...skill1,
        category: 'cat2'
      }

      const hash1 = adapter.getSkillHashPublic(skill1)
      const hash2 = adapter.getSkillHashPublic(skill2)

      expect(hash1).not.toBe(hash2)
    })

    it('should not include id, createdAt, updatedAt in hash', () => {
      const skill1: Skill = {
        id: 'id-1',
        name: 'Name',
        description: 'Description',
        content: 'Content',
        category: 'cat',
        tags: ['tag'],
        createdAt: 111,
        updatedAt: 222
      }

      const skill2: Skill = {
        ...skill1,
        id: 'id-2',
        createdAt: 333,
        updatedAt: 444
      }

      const hash1 = adapter.getSkillHashPublic(skill1)
      const hash2 = adapter.getSkillHashPublic(skill2)

      expect(hash1).toBe(hash2)
    })
  })

  describe('syncSkill and getSkillSyncState', () => {
    let tempDir: string
    let testDir: string
    let adapter: TestAdapter

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'base-adapter-test-'))
      testDir = join(tempDir, 'skills')
      adapter = new TestAdapter()
    })

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true })
    })

    it('should return unsynced for non-existent skill', async () => {
      const skill: Skill = {
        id: 'test-skill',
        name: 'Test',
        description: 'Test desc',
        content: 'Test content',
        category: 'test',
        tags: ['test'],
        createdAt: 123,
        updatedAt: 456
      }

      const status = await adapter.getSkillSyncState(skill, testDir)
      expect(status).toBe('unsynced' as SyncStatus)
    })

    it('should sync skill and return synced status', async () => {
      const skill: Skill = {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'Test description',
        content: 'Test content',
        category: 'test',
        tags: ['test'],
        createdAt: 123,
        updatedAt: 456
      }

      await adapter.syncSkill(skill, testDir)

      const status = await adapter.getSkillSyncState(skill, testDir)
      expect(status).toBe('synced' as SyncStatus)
    })

    it('should return modified status when skill content changes', async () => {
      const skill: Skill = {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'Test description',
        content: 'Test content',
        category: 'test',
        tags: ['test'],
        createdAt: 123,
        updatedAt: 456
      }

      await adapter.syncSkill(skill, testDir)

      const modifiedSkill: Skill = {
        ...skill,
        content: 'Modified content'
      }

      const status = await adapter.getSkillSyncState(modifiedSkill, testDir)
      expect(status).toBe('modified' as SyncStatus)
    })
  })

  describe('removeSkill', () => {
    let tempDir: string
    let testDir: string
    let adapter: TestAdapter

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'base-adapter-test-'))
      testDir = join(tempDir, 'skills')
      adapter = new TestAdapter()
    })

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true })
    })

    it('should remove skill directory', async () => {
      const skill: Skill = {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'Test description',
        content: 'Test content',
        category: 'test',
        tags: ['test'],
        createdAt: 123,
        updatedAt: 456
      }

      await adapter.syncSkill(skill, testDir)

      const skillDir = join(testDir, skill.id)
      const existsBefore = await import('node:fs/promises').then((fs) =>
        fs
          .access(skillDir)
          .then(() => true)
          .catch(() => false)
      )
      expect(existsBefore).toBe(true)

      await adapter.removeSkill(skill.id, testDir)

      const existsAfter = await import('node:fs/promises').then((fs) =>
        fs
          .access(skillDir)
          .then(() => true)
          .catch(() => false)
      )
      expect(existsAfter).toBe(false)
    })

    it('should not throw for non-existent skill', async () => {
      await expect(adapter.removeSkill('non-existent', testDir)).resolves.not.toThrow()
    })
  })
})
