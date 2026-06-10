import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { SkillRepositoryService } from './skillRepository'
import { CategoryService } from './category'
import { GitService } from './git'
import { SyncService } from './syncService'
import { MockAdapter } from './adapters/mock'
import { ToolType } from '@shared/types/adapter'
import type { SkillMetadata } from '@shared/types/skill'

describe('Data Consistency Verification', () => {
  let tempDir: string
  let toolDir: string
  let skillRepo: SkillRepositoryService
  let categoryService: CategoryService
  let gitService: GitService
  let syncService: SyncService

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skill-hub-consistency-'))
    toolDir = await mkdtemp(join(tmpdir(), 'skill-hub-tool-consistency-'))
    skillRepo = new SkillRepositoryService(tempDir)
    categoryService = new CategoryService(tempDir)
    gitService = new GitService(tempDir)
    syncService = new SyncService(tempDir, [new MockAdapter(true, toolDir)])
    await skillRepo.init()
    await gitService.init()
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
    await rm(toolDir, { recursive: true, force: true })
  })

  describe('Skill 文件存储格式', () => {
    it('Skill 文件在磁盘上的存储格式正确', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Format Test Skill',
        description: 'Testing file format',
        content: '# Test Content\n\nThis is **markdown** content.',
        category: 'testing',
        tags: ['format', 'test']
      })

      const skillDir = join(tempDir, 'skills', skill.id)
      const files = await readdir(skillDir)
      expect(files).toContain('skill.json')
      expect(files).toContain('content.md')
      expect(files.length).toBe(2)
    })

    it('skill.json 内容格式正确', async () => {
      const skill = await skillRepo.createSkill({
        name: 'JSON Test',
        description: 'Testing JSON format',
        content: '# Content',
        category: 'json',
        tags: ['json']
      })

      const metadataPath = join(tempDir, 'skills', skill.id, 'skill.json')
      const raw = await readFile(metadataPath, 'utf-8')
      const metadata = JSON.parse(raw) as SkillMetadata

      expect(metadata.id).toBe(skill.id)
      expect(metadata.name).toBe(skill.name)
      expect(metadata.description).toBe(skill.description)
      expect(metadata.category).toBe(skill.category)
      expect(metadata.tags).toEqual(skill.tags)
      expect(metadata.createdAt).toBe(skill.createdAt)
      expect(metadata.updatedAt).toBe(skill.updatedAt)
      expect(typeof metadata.createdAt).toBe('number')
      expect(typeof metadata.updatedAt).toBe('number')
    })

    it('content.md 内容正确', async () => {
      const content = '# Markdown Test\n\n- Item 1\n- Item 2\n\n```js\nconsole.log("hello")\n```'
      const skill = await skillRepo.createSkill({
        name: 'MD Test',
        description: 'Testing markdown',
        content,
        category: 'markdown',
        tags: ['md']
      })

      const contentPath = join(tempDir, 'skills', skill.id, 'content.md')
      const fileContent = await readFile(contentPath, 'utf-8')
      expect(fileContent).toBe(content)
    })

    it('skill.json 和 content.md 内容一致性', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Consistency Check',
        description: 'Check consistency',
        content: '# Consistency Content',
        category: 'consistency',
        tags: ['check']
      })

      const metadataPath = join(tempDir, 'skills', skill.id, 'skill.json')
      const contentPath = join(tempDir, 'skills', skill.id, 'content.md')

      const [metadataRaw, fileContent] = await Promise.all([
        readFile(metadataPath, 'utf-8'),
        readFile(contentPath, 'utf-8')
      ])

      const metadata = JSON.parse(metadataRaw) as SkillMetadata

      expect(metadata.id).toBe(skill.id)
      expect(fileContent).toBe(skill.content)

      const fetchedSkill = await skillRepo.getSkill(skill.id)
      expect(fetchedSkill).toEqual(skill)
      expect(fetchedSkill!.content).toBe(fileContent)
      expect(fetchedSkill!.name).toBe(metadata.name)
    })
  })

  describe('分类数据持久化', () => {
    it('分类数据持久化正确', async () => {
      const cat1 = await categoryService.createCategory({ name: 'Category 1', color: '#ff0000' })
      const cat2 = await categoryService.createCategory({ name: 'Category 2', color: '#00ff00' })

      const categoriesPath = join(tempDir, 'categories.json')
      const raw = await readFile(categoriesPath, 'utf-8')
      const categories = JSON.parse(raw)

      expect(categories.length).toBe(2)
      expect(categories.find((c: any) => c.id === cat1.id)).toBeDefined()
      expect(categories.find((c: any) => c.id === cat2.id)).toBeDefined()
      expect(categories.find((c: any) => c.id === cat1.id).name).toBe('Category 1')
      expect(categories.find((c: any) => c.id === cat2.id).color).toBe('#00ff00')

      const newCategoryService = new CategoryService(tempDir)
      const loadedCategories = await newCategoryService.listCategories()
      expect(loadedCategories.length).toBe(2)
      expect(loadedCategories.map((c) => c.id).sort()).toEqual([cat1.id, cat2.id].sort())
    })

    it('更新分类后持久化正确', async () => {
      const category = await categoryService.createCategory({ name: 'Old Name', color: '#000000' })

      await categoryService.updateCategory(category.id, { name: 'New Name', color: '#ffffff' })

      const categoriesPath = join(tempDir, 'categories.json')
      const raw = await readFile(categoriesPath, 'utf-8')
      const categories = JSON.parse(raw)
      const updated = categories.find((c: any) => c.id === category.id)

      expect(updated.name).toBe('New Name')
      expect(updated.color).toBe('#ffffff')
    })

    it('删除分类后持久化正确', async () => {
      const cat1 = await categoryService.createCategory({ name: 'To Keep' })
      const cat2 = await categoryService.createCategory({ name: 'To Delete' })

      await categoryService.deleteCategory(cat2.id)

      const categoriesPath = join(tempDir, 'categories.json')
      const raw = await readFile(categoriesPath, 'utf-8')
      const categories = JSON.parse(raw)

      expect(categories.length).toBe(1)
      expect(categories[0].id).toBe(cat1.id)
      expect(categories[0].name).toBe('To Keep')
    })
  })

  describe('同步状态存储', () => {
    it('同步状态存储正确', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Sync State Test',
        description: 'Testing sync state storage',
        content: '# Content',
        category: 'sync',
        tags: ['sync']
      })

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      const syncStatesPath = join(tempDir, '.skill-hub', 'sync-states.json')
      const raw = await readFile(syncStatesPath, 'utf-8')
      const syncStates = JSON.parse(raw)

      expect(syncStates.length).toBe(1)
      expect(syncStates[0].skillId).toBe(skill.id)
      expect(syncStates[0].states.length).toBe(1)
      expect(syncStates[0].states[0].toolType).toBe(ToolType.TRAE)
      expect(syncStates[0].states[0].status).toBe('synced')
      expect(syncStates[0].states[0].lastSyncAt).toBeDefined()
      expect(syncStates[0].states[0].syncedHash).toBeDefined()

      const newSyncService = new SyncService(tempDir, [new MockAdapter(true, toolDir)])
      const states = await newSyncService.getSkillSyncStates(skill.id)
      expect(states.length).toBe(1)
      expect(states[0].status).toBe('synced')
    })

    it('删除同步状态正确', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Remove Sync Test',
        description: 'Testing sync state removal',
        content: '# Content',
        category: 'sync',
        tags: ['remove']
      })

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)
      await syncService.removeSkillFromTool(skill.id, ToolType.TRAE)

      const syncStatesPath = join(tempDir, '.skill-hub', 'sync-states.json')
      const raw = await readFile(syncStatesPath, 'utf-8')
      const syncStates = JSON.parse(raw)

      expect(syncStates.length).toBe(0)
    })
  })

  describe('损坏文件处理', () => {
    it('损坏的 skill.json 能正确处理', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Corrupt Test',
        description: 'Testing corrupt file',
        content: '# Content',
        category: 'test',
        tags: ['corrupt']
      })

      const metadataPath = join(tempDir, 'skills', skill.id, 'skill.json')
      await writeFile(metadataPath, 'this is not valid json', 'utf-8')

      await expect(skillRepo.getSkill(skill.id)).rejects.toThrow()
    })

    it('缺失 content.md 的 Skill 返回 null', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Missing Content Test',
        description: 'Testing missing content',
        content: '# Content',
        category: 'test',
        tags: ['missing']
      })

      const contentPath = join(tempDir, 'skills', skill.id, 'content.md')
      await rm(contentPath, { force: true })

      const result = await skillRepo.getSkill(skill.id)
      expect(result).toBeNull()
    })

    it('非目录条目被正确忽略', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Valid Skill',
        description: 'A valid skill',
        content: '# Content',
        category: 'test',
        tags: ['valid']
      })

      const filePath = join(tempDir, 'skills', 'not-a-directory.txt')
      await writeFile(filePath, 'this is a file, not a directory', 'utf-8')

      const skills = await skillRepo.listSkills()
      expect(skills.length).toBe(1)
      expect(skills[0].id).toBe(skill.id)
    })
  })
})
