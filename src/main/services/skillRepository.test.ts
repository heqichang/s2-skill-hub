import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { SkillRepositoryService } from './skillRepository'
import type { Skill } from '@shared/types/skill'

describe('SkillRepositoryService', () => {
  let tempDir: string
  let service: SkillRepositoryService

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skill-hub-test-'))
    service = new SkillRepositoryService(tempDir)
    await service.init()
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('init', () => {
    it('should initialize the repository structure', async () => {
      const initialized = await service.isInitialized()
      expect(initialized).toBe(true)
    })

    it('should be idempotent', async () => {
      await service.init()
      const initialized = await service.isInitialized()
      expect(initialized).toBe(true)
    })
  })

  describe('isInitialized', () => {
    it('should return false for uninitialized repo', async () => {
      const uninitializedDir = await mkdtemp(join(tmpdir(), 'skill-hub-uninit-'))
      const newService = new SkillRepositoryService(uninitializedDir)
      const initialized = await newService.isInitialized()
      expect(initialized).toBe(false)
      await rm(uninitializedDir, { recursive: true, force: true })
    })
  })

  describe('createSkill', () => {
    it('should create a new skill', async () => {
      const skillData = {
        name: 'Test Skill',
        description: 'A test skill',
        content: '# Test Content\n\nThis is a test.',
        category: 'testing',
        tags: ['test', 'example']
      }

      const skill = await service.createSkill(skillData)

      expect(skill.id).toBeDefined()
      expect(skill.name).toBe(skillData.name)
      expect(skill.description).toBe(skillData.description)
      expect(skill.content).toBe(skillData.content)
      expect(skill.category).toBe(skillData.category)
      expect(skill.tags).toEqual(skillData.tags)
      expect(skill.createdAt).toBeGreaterThan(0)
      expect(skill.updatedAt).toBe(skill.createdAt)
    })
  })

  describe('getSkill', () => {
    it('should return the skill by id', async () => {
      const skillData = {
        name: 'Test Skill',
        description: 'A test skill',
        content: '# Test Content',
        category: 'testing',
        tags: ['test']
      }

      const created = await service.createSkill(skillData)
      const fetched = await service.getSkill(created.id)

      expect(fetched).not.toBeNull()
      expect(fetched?.id).toBe(created.id)
      expect(fetched?.name).toBe(created.name)
      expect(fetched?.content).toBe(created.content)
    })

    it('should return null for non-existent skill', async () => {
      const skill = await service.getSkill('non-existent-id')
      expect(skill).toBeNull()
    })
  })

  describe('listSkills', () => {
    it('should return empty array when no skills exist', async () => {
      const skills = await service.listSkills()
      expect(skills).toEqual([])
    })

    it('should return all skills sorted by updatedAt descending', async () => {
      const skill1 = await service.createSkill({
        name: 'Skill 1',
        description: 'First skill',
        content: 'Content 1',
        category: 'cat1',
        tags: ['tag1']
      })

      await new Promise((resolve) => setTimeout(resolve, 10))

      const skill2 = await service.createSkill({
        name: 'Skill 2',
        description: 'Second skill',
        content: 'Content 2',
        category: 'cat2',
        tags: ['tag2']
      })

      const skills = await service.listSkills()
      expect(skills).toHaveLength(2)
      expect(skills[0].id).toBe(skill2.id)
      expect(skills[1].id).toBe(skill1.id)
    })
  })

  describe('updateSkill', () => {
    let skill: Skill

    beforeEach(async () => {
      skill = await service.createSkill({
        name: 'Original Name',
        description: 'Original description',
        content: 'Original content',
        category: 'original',
        tags: ['original']
      })
    })

    it('should update skill fields', async () => {
      const updated = await service.updateSkill(skill.id, {
        name: 'Updated Name',
        description: 'Updated description'
      })

      expect(updated.name).toBe('Updated Name')
      expect(updated.description).toBe('Updated description')
      expect(updated.content).toBe(skill.content)
      expect(updated.updatedAt).toBeGreaterThan(skill.updatedAt)
      expect(updated.createdAt).toBe(skill.createdAt)
    })

    it('should update content', async () => {
      const updated = await service.updateSkill(skill.id, {
        content: 'New content'
      })

      expect(updated.content).toBe('New content')
    })

    it('should update tags', async () => {
      const updated = await service.updateSkill(skill.id, {
        tags: ['new', 'tags']
      })

      expect(updated.tags).toEqual(['new', 'tags'])
    })

    it('should throw error for non-existent skill', async () => {
      await expect(service.updateSkill('non-existent', { name: 'Test' })).rejects.toThrow(
        'Skill with id non-existent not found'
      )
    })
  })

  describe('deleteSkill', () => {
    it('should delete a skill', async () => {
      const skill = await service.createSkill({
        name: 'To Delete',
        description: 'Will be deleted',
        content: 'Delete me',
        category: 'test',
        tags: ['delete']
      })

      await service.deleteSkill(skill.id)
      const fetched = await service.getSkill(skill.id)
      expect(fetched).toBeNull()
    })

    it('should not throw for non-existent skill', async () => {
      await expect(service.deleteSkill('non-existent')).resolves.not.toThrow()
    })
  })

  describe('searchSkills', () => {
    beforeEach(async () => {
      await service.createSkill({
        name: 'Python Programming',
        description: 'Learn Python programming language',
        content: '# Python Tutorial\n\nPython is a great language.',
        category: 'programming',
        tags: ['python', 'code', 'beginner']
      })

      await service.createSkill({
        name: 'JavaScript Basics',
        description: 'Introduction to JavaScript',
        content: '# JS Guide\n\nJavaScript for web development.',
        category: 'programming',
        tags: ['javascript', 'web', 'beginner']
      })

      await service.createSkill({
        name: 'Cooking Pasta',
        description: 'How to cook perfect pasta',
        content: '# Pasta Recipe\n\nBoil water, add pasta.',
        category: 'cooking',
        tags: ['food', 'recipe']
      })
    })

    it('should search by name', async () => {
      const results = await service.searchSkills('Python')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Python Programming')
    })

    it('should search by description', async () => {
      const results = await service.searchSkills('Introduction')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('JavaScript Basics')
    })

    it('should search by content', async () => {
      const results = await service.searchSkills('great language')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Python Programming')
    })

    it('should search by tag', async () => {
      const results = await service.searchSkills('beginner')
      expect(results).toHaveLength(2)
    })

    it('should be case insensitive', async () => {
      const results = await service.searchSkills('python')
      expect(results).toHaveLength(1)
    })

    it('should return all skills for empty query', async () => {
      const results = await service.searchSkills('')
      expect(results).toHaveLength(3)
    })

    it('should return empty array for no matches', async () => {
      const results = await service.searchSkills('nonexistentword')
      expect(results).toHaveLength(0)
    })
  })
})
