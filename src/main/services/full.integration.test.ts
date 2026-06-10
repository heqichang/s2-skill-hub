import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { SkillRepositoryService } from './skillRepository'
import { CategoryService } from './category'
import { GitService } from './git'
import { SyncService } from './syncService'
import { MockAdapter } from './adapters/mock'
import { ToolType } from '@shared/types/adapter'
import { SyncStatus } from '@shared/types/skill'

describe('Full Service Integration', () => {
  let tempDir: string
  let toolDir: string
  let skillRepo: SkillRepositoryService
  let categoryService: CategoryService
  let gitService: GitService
  let syncService: SyncService
  let mockAdapter: MockAdapter

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skill-hub-full-test-'))
    toolDir = await mkdtemp(join(tmpdir(), 'skill-hub-tool-full-'))

    skillRepo = new SkillRepositoryService(tempDir)
    categoryService = new CategoryService(tempDir)
    gitService = new GitService(tempDir)
    mockAdapter = new MockAdapter(true, toolDir)
    syncService = new SyncService(tempDir, [mockAdapter])

    await skillRepo.init()
    await gitService.init()
  })

  afterEach(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100))
    try {
      await rm(tempDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
    try {
      await rm(toolDir, { recursive: true, force: true })
    } catch {
      // ignore cleanup errors
    }
  })

  describe('完整端到端流程', () => {
    it('完整流程：初始化仓库 → 创建分类 → 创建 Skill → 提交 Git → 同步到工具 → 修改 Skill → 再次提交 → 回滚 → 验证状态', async () => {
      const category = await categoryService.createCategory({
        name: 'Test Category',
        color: '#ff0000'
      })
      expect(category.id).toBeDefined()
      expect(category.name).toBe('Test Category')

      const skill = await skillRepo.createSkill({
        name: 'Full Flow Skill',
        description: 'Skill for full flow test',
        content: '# Full Flow Content\n\nThis is a test skill.',
        category: category.name,
        tags: ['full', 'flow', 'test']
      })
      expect(skill.id).toBeDefined()

      const gitStatus1 = await gitService.getStatus()
      expect(gitStatus1.isRepo).toBe(true)
      expect(gitStatus1.hasChanges).toBe(true)

      const commit1 = await gitService.commit('Initial commit: Add category and skill')
      expect(commit1.message).toBe('Initial commit: Add category and skill')

      const gitStatus2 = await gitService.getStatus()
      expect(gitStatus2.hasChanges).toBe(false)

      const history1 = await gitService.getHistory()
      expect(history1.length).toBe(1)

      const syncStates1 = await syncService.getSkillSyncStates(skill.id)
      expect(syncStates1[0].status).toBe(SyncStatus.UNSYNCED)

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      const syncStates2 = await syncService.getSkillSyncStates(skill.id)
      expect(syncStates2[0].status).toBe(SyncStatus.SYNCED)
      expect(syncStates2[0].lastSyncAt).toBeDefined()
      expect(syncStates2[0].syncedHash).toBeDefined()

      const toolSkillDir = join(toolDir, skill.id)
      const toolFiles = await readdir(toolSkillDir)
      expect(toolFiles.length).toBeGreaterThan(0)

      const updatedSkill = await skillRepo.updateSkill(skill.id, {
        name: 'Full Flow Skill Updated',
        description: 'Updated description',
        content: '# Updated Content\n\nThis is updated content.',
        tags: ['full', 'flow', 'test', 'updated']
      })
      expect(updatedSkill.name).toBe('Full Flow Skill Updated')
      expect(updatedSkill.updatedAt).toBeGreaterThan(skill.updatedAt)

      const syncStates3 = await syncService.getSkillSyncStates(skill.id)
      expect(syncStates3[0].status).toBe(SyncStatus.MODIFIED)

      const gitStatus3 = await gitService.getStatus()
      expect(gitStatus3.hasChanges).toBe(true)

      const commit2 = await gitService.commit('Update skill')
      expect(commit2.message).toBe('Update skill')

      const history2 = await gitService.getHistory()
      expect(history2.length).toBe(2)
      expect(history2[0].message).toBe('Update skill')
      expect(history2[1].message).toBe('Initial commit: Add category and skill')

      await gitService.rollback(commit1.hash)

      const rolledBackSkill = await skillRepo.getSkill(skill.id)
      expect(rolledBackSkill?.name).toBe('Full Flow Skill')
      expect(rolledBackSkill?.description).toBe('Skill for full flow test')
      expect(rolledBackSkill?.content.replace(/\r\n/g, '\n')).toBe(
        '# Full Flow Content\n\nThis is a test skill.'
      )
      expect(rolledBackSkill?.tags).toEqual(['full', 'flow', 'test'])

      const history3 = await gitService.getHistory()
      expect(history3.length).toBe(1)
      expect(history3[0].hash).toBe(commit1.hash)
    }, 60000)
  })

  describe('多服务状态一致性', () => {
    it('所有服务对同一 Skill 的状态一致', async () => {
      const category = await categoryService.createCategory({
        name: 'Consistency Category'
      })

      const skill = await skillRepo.createSkill({
        name: 'Consistency Skill',
        description: 'Testing consistency',
        content: '# Content',
        category: category.name,
        tags: ['consistency']
      })

      const skillFromRepo = await skillRepo.getSkill(skill.id)
      expect(skillFromRepo).toBeDefined()
      expect(skillFromRepo!.id).toBe(skill.id)

      const allSkills = await skillRepo.listSkills()
      expect(allSkills.length).toBe(1)
      expect(allSkills[0].id).toBe(skill.id)

      const gitStatus = await gitService.getStatus()
      expect(gitStatus.hasChanges).toBe(true)

      const skillFiles = gitStatus.changedFiles.filter((f) =>
        f.file.includes(skill.id.substring(0, 8))
      )
      expect(skillFiles.length).toBeGreaterThanOrEqual(2)

      const syncStates = await syncService.getSkillSyncStates(skill.id)
      expect(syncStates.length).toBe(1)
      expect(syncStates[0].status).toBe(SyncStatus.UNSYNCED)

      await gitService.commit('Initial commit')

      const gitStatusAfter = await gitService.getStatus()
      expect(gitStatusAfter.hasChanges).toBe(false)

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      const syncStatesAfter = await syncService.getSkillSyncStates(skill.id)
      expect(syncStatesAfter[0].status).toBe(SyncStatus.SYNCED)

      const toolSkillDir = join(toolDir, skill.id)
      const toolMetadataRaw = await readFile(join(toolSkillDir, 'skill.json'), 'utf-8')
      const toolMetadata = JSON.parse(toolMetadataRaw)
      expect(toolMetadata.id).toBe(skill.id)
      expect(toolMetadata.name).toBe(skill.name)

      const toolContent = await readFile(join(toolSkillDir, 'content.md'), 'utf-8')
      expect(toolContent).toBe(skill.content)

      const categories = await categoryService.listCategories()
      expect(categories.length).toBe(1)
      expect(categories[0].id).toBe(category.id)
      expect(categories[0].name).toBe('Consistency Category')
    })

    it('删除 Skill 后所有服务状态一致', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Delete Consistency Skill',
        description: 'Testing delete consistency',
        content: '# Content',
        category: 'test',
        tags: ['delete']
      })

      await gitService.commit('Add skill')
      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      const syncStatesBefore = await syncService.getSkillSyncStates(skill.id)
      expect(syncStatesBefore[0].status).toBe(SyncStatus.SYNCED)

      const toolExistsBefore = await readdir(toolDir).then((files) => files.includes(skill.id))
      expect(toolExistsBefore).toBe(true)

      await syncService.removeSkillFromTool(skill.id, ToolType.TRAE)
      await skillRepo.deleteSkill(skill.id)

      const skillAfterDelete = await skillRepo.getSkill(skill.id)
      expect(skillAfterDelete).toBeNull()

      const allSkillsAfter = await skillRepo.listSkills()
      expect(allSkillsAfter.length).toBe(0)

      const toolExistsAfter = await readdir(toolDir)
        .then((files) => files.includes(skill.id))
        .catch(() => false)
      expect(toolExistsAfter).toBe(false)

      const gitStatus = await gitService.getStatus()
      expect(gitStatus.hasChanges).toBe(true)

      const deletedFiles = gitStatus.changedFiles.filter((f) => f.status === 'deleted')
      expect(deletedFiles.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('复杂场景', () => {
    it('多个分类和 Skill 的复杂交互', async () => {
      const cat1 = await categoryService.createCategory({ name: 'Category 1' })
      const cat2 = await categoryService.createCategory({ name: 'Category 2' })

      const skills = await Promise.all([
        skillRepo.createSkill({
          name: 'Skill A',
          description: 'Skill in cat 1',
          content: '# Skill A',
          category: cat1.name,
          tags: ['a', 'shared']
        }),
        skillRepo.createSkill({
          name: 'Skill B',
          description: 'Skill in cat 1',
          content: '# Skill B',
          category: cat1.name,
          tags: ['b', 'shared']
        }),
        skillRepo.createSkill({
          name: 'Skill C',
          description: 'Skill in cat 2',
          content: '# Skill C',
          category: cat2.name,
          tags: ['c']
        })
      ])

      const allSkills = await skillRepo.listSkills()
      expect(allSkills.length).toBe(3)

      const searchResults = await skillRepo.searchSkills('shared')
      expect(searchResults.length).toBe(2)

      await gitService.commit('Add all skills and categories')

      const history = await gitService.getHistory()
      expect(history.length).toBe(1)

      await syncService.syncAllSkillsToTool(ToolType.TRAE)

      const allSyncStates = await syncService.getAllSkillsSyncStates()
      expect(allSyncStates.size).toBe(3)
      for (const [, states] of allSyncStates) {
        expect(states[0].status).toBe(SyncStatus.SYNCED)
      }

      const toolFiles = await readdir(toolDir)
      expect(toolFiles.length).toBe(3)

      await skillRepo.updateSkill(skills[0].id, {
        category: cat2.name
      })

      const updatedSkill = await skillRepo.getSkill(skills[0].id)
      expect(updatedSkill?.category).toBe(cat2.name)

      const syncStatesAfter = await syncService.getSkillSyncStates(skills[0].id)
      expect(syncStatesAfter[0].status).toBe(SyncStatus.MODIFIED)
    })

    it('回滚后同步状态正确处理', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Rollback Sync Skill',
        description: 'Test rollback and sync',
        content: '# V1 Content',
        category: 'rollback',
        tags: ['rollback']
      })

      const commit1 = await gitService.commit('V1')

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      const syncStates1 = await syncService.getSkillSyncStates(skill.id)
      expect(syncStates1[0].status).toBe(SyncStatus.SYNCED)

      await skillRepo.updateSkill(skill.id, {
        content: '# V2 Content'
      })

      await gitService.commit('V2')

      const syncStates2 = await syncService.getSkillSyncStates(skill.id)
      expect(syncStates2[0].status).toBe(SyncStatus.MODIFIED)

      await gitService.rollback(commit1.hash)

      const rolledBackSkill = await skillRepo.getSkill(skill.id)
      expect(rolledBackSkill?.content.replace(/\r\n/g, '\n')).toBe('# V1 Content')

      const syncStates3 = await syncService.getSkillSyncStates(skill.id)
      expect(syncStates3[0].status).toBe(SyncStatus.SYNCED)
    })
  })
})
