import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readdir, readFile, access, constants } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { SkillRepositoryService } from './skillRepository'
import { SyncService } from './syncService'
import { MockAdapter } from './adapters/mock'
import { ToolType } from '@shared/types/adapter'
import { SyncStatus } from '@shared/types/skill'

describe('Repo + Sync Integration', () => {
  let tempDir: string
  let toolDir: string
  let skillRepo: SkillRepositoryService
  let syncService: SyncService
  let mockAdapter: MockAdapter

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skill-hub-repo-sync-test-'))
    toolDir = await mkdtemp(join(tmpdir(), 'skill-hub-tool-dir-'))

    skillRepo = new SkillRepositoryService(tempDir)
    await skillRepo.init()

    mockAdapter = new MockAdapter(true, toolDir)
    syncService = new SyncService(tempDir, [mockAdapter])
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
    await rm(toolDir, { recursive: true, force: true })
  })

  describe('同步到工具', () => {
    it('创建 Skill 后同步到工具', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Sync Test Skill',
        description: 'Skill to test sync',
        content: '# Sync Content',
        category: 'sync',
        tags: ['sync', 'test']
      })

      const toolFilesBefore = await readdir(toolDir).catch(() => [])
      expect(toolFilesBefore.length).toBe(0)

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      const toolFilesAfter = await readdir(toolDir)
      expect(toolFilesAfter.length).toBe(1)
      expect(toolFilesAfter[0]).toBe(skill.id)

      const skillDir = join(toolDir, skill.id)
      const skillFiles = await readdir(skillDir)
      expect(skillFiles).toContain('skill.json')
      expect(skillFiles).toContain('content.md')
      expect(skillFiles).toContain('.skill-hash')
    })

    it('同步后内容正确', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Content Verify Skill',
        description: 'Verify content after sync',
        content: '# Verify Content\n\nThis is the content.',
        category: 'verify',
        tags: ['verify']
      })

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      const metadataRaw = await readFile(join(toolDir, skill.id, 'skill.json'), 'utf-8')
      const metadata = JSON.parse(metadataRaw)
      expect(metadata.name).toBe(skill.name)
      expect(metadata.description).toBe(skill.description)
      expect(metadata.category).toBe(skill.category)
      expect(metadata.tags).toEqual(skill.tags)

      const content = await readFile(join(toolDir, skill.id, 'content.md'), 'utf-8')
      expect(content).toBe(skill.content)
    })
  })

  describe('同步状态', () => {
    it('同步状态正确显示为"已同步"', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Status Test Skill',
        description: 'Test sync status',
        content: '# Status Content',
        category: 'status',
        tags: ['status']
      })

      const statesBefore = await syncService.getSkillSyncStates(skill.id)
      expect(statesBefore.length).toBe(1)
      expect(statesBefore[0].status).toBe(SyncStatus.UNSYNCED)

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      const statesAfter = await syncService.getSkillSyncStates(skill.id)
      expect(statesAfter.length).toBe(1)
      expect(statesAfter[0].status).toBe(SyncStatus.SYNCED)
      expect(statesAfter[0].lastSyncAt).toBeDefined()
      expect(statesAfter[0].syncedHash).toBeDefined()
    })

    it('修改 Skill 后同步状态变为"有变更"', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Modified Test Skill',
        description: 'Test modified status',
        content: '# Original Content',
        category: 'modified',
        tags: ['modified']
      })

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      const statesAfterSync = await syncService.getSkillSyncStates(skill.id)
      expect(statesAfterSync[0].status).toBe(SyncStatus.SYNCED)

      await skillRepo.updateSkill(skill.id, {
        content: '# Modified Content'
      })

      const statesAfterModify = await syncService.getSkillSyncStates(skill.id)
      expect(statesAfterModify[0].status).toBe(SyncStatus.MODIFIED)
    })

    it('再次同步后状态恢复为"已同步"', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Re-sync Test Skill',
        description: 'Test re-sync status',
        content: '# Original Content',
        category: 'resync',
        tags: ['resync']
      })

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      await skillRepo.updateSkill(skill.id, {
        content: '# Modified Content'
      })

      const statesAfterModify = await syncService.getSkillSyncStates(skill.id)
      expect(statesAfterModify[0].status).toBe(SyncStatus.MODIFIED)

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      const statesAfterResync = await syncService.getSkillSyncStates(skill.id)
      expect(statesAfterResync[0].status).toBe(SyncStatus.SYNCED)
    })
  })

  describe('删除 Skill 后从工具目录移除', () => {
    it('删除 Skill 后从工具目录移除', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Delete Test Skill',
        description: 'Test delete sync',
        content: '# Delete Content',
        category: 'delete',
        tags: ['delete']
      })

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      const existsBefore = await access(join(toolDir, skill.id), constants.F_OK)
        .then(() => true)
        .catch(() => false)
      expect(existsBefore).toBe(true)

      await syncService.removeSkillFromTool(skill.id, ToolType.TRAE)

      const existsAfter = await access(join(toolDir, skill.id), constants.F_OK)
        .then(() => true)
        .catch(() => false)
      expect(existsAfter).toBe(false)

      const states = await syncService.getSkillSyncStates(skill.id)
      expect(states.length).toBe(1)
      expect(states[0].status).toBe(SyncStatus.UNSYNCED)
    })
  })

  describe('批量同步', () => {
    it('批量同步多个 Skill', async () => {
      const skills = await Promise.all([
        skillRepo.createSkill({
          name: 'Batch Skill 1',
          description: 'First batch skill',
          content: '# Batch 1 Content',
          category: 'batch',
          tags: ['batch']
        }),
        skillRepo.createSkill({
          name: 'Batch Skill 2',
          description: 'Second batch skill',
          content: '# Batch 2 Content',
          category: 'batch',
          tags: ['batch']
        }),
        skillRepo.createSkill({
          name: 'Batch Skill 3',
          description: 'Third batch skill',
          content: '# Batch 3 Content',
          category: 'batch',
          tags: ['batch']
        })
      ])

      const toolFilesBefore = await readdir(toolDir).catch(() => [])
      expect(toolFilesBefore.length).toBe(0)

      await syncService.syncAllSkillsToTool(ToolType.TRAE)

      const toolFilesAfter = await readdir(toolDir)
      expect(toolFilesAfter.length).toBe(3)

      for (const skill of skills) {
        expect(toolFilesAfter).toContain(skill.id)

        const states = await syncService.getSkillSyncStates(skill.id)
        expect(states[0].status).toBe(SyncStatus.SYNCED)
      }

      const allStates = await syncService.getAllSkillsSyncStates()
      expect(allStates.size).toBe(3)
    })

    it('批量同步后修改其中一个的状态', async () => {
      const skills = await Promise.all([
        skillRepo.createSkill({
          name: 'Batch Modify 1',
          description: 'First skill',
          content: '# Content 1',
          category: 'batch-modify',
          tags: ['batch']
        }),
        skillRepo.createSkill({
          name: 'Batch Modify 2',
          description: 'Second skill',
          content: '# Content 2',
          category: 'batch-modify',
          tags: ['batch']
        })
      ])

      await syncService.syncAllSkillsToTool(ToolType.TRAE)

      await skillRepo.updateSkill(skills[0].id, {
        content: '# Modified Content 1'
      })

      const states0 = await syncService.getSkillSyncStates(skills[0].id)
      expect(states0[0].status).toBe(SyncStatus.MODIFIED)

      const states1 = await syncService.getSkillSyncStates(skills[1].id)
      expect(states1[0].status).toBe(SyncStatus.SYNCED)
    })
  })

  describe('同步状态持久化', () => {
    it('同步状态正确存储并可恢复', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Persistence Test',
        description: 'Test sync state persistence',
        content: '# Persistence Content',
        category: 'persistence',
        tags: ['persistence']
      })

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      const newSyncService = new SyncService(tempDir, [mockAdapter])

      const states = await newSyncService.getSkillSyncStates(skill.id)
      expect(states.length).toBe(1)
      expect(states[0].status).toBe(SyncStatus.SYNCED)
      expect(states[0].lastSyncAt).toBeDefined()
      expect(states[0].syncedHash).toBeDefined()
    })
  })
})
