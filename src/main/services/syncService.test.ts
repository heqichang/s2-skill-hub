import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { SyncService } from './syncService'
import { SkillRepositoryService } from './skillRepository'
import { MockAdapter } from './adapters/mock'
import { ToolType } from '@shared/types/adapter'
import { SyncStatus } from '@shared/types/skill'

describe('SyncService', () => {
  let tempDir: string
  let skillRepoPath: string
  let skillTargetDir: string
  let skillRepo: SkillRepositoryService
  let adapter: MockAdapter
  let syncService: SyncService

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'sync-service-test-'))
    skillRepoPath = join(tempDir, 'skill-repo')
    skillTargetDir = join(tempDir, 'target-skills')

    skillRepo = new SkillRepositoryService(skillRepoPath)
    await skillRepo.init()

    adapter = new MockAdapter(true, skillTargetDir)
    syncService = new SyncService(skillRepoPath, [adapter])
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('registerAdapter and getAdapters', () => {
    it('should return registered adapters', () => {
      const adapters = syncService.getAdapters()
      expect(adapters).toHaveLength(1)
      expect(adapters[0].toolType).toBe(ToolType.TRAE)
    })

    it('should register new adapters', () => {
      const newAdapter = new MockAdapter(true, null)
      syncService.registerAdapter(newAdapter)

      const adapters = syncService.getAdapters()
      expect(adapters).toHaveLength(2)
    })
  })

  describe('getToolInfo', () => {
    it('should return tool info for installed tool', async () => {
      const info = await syncService.getToolInfo(ToolType.TRAE)

      expect(info.type).toBe(ToolType.TRAE)
      expect(info.name).toBe('Mock Tool')
      expect(info.isInstalled).toBe(true)
      expect(info.skillDirPath).toBe(skillTargetDir)
    })

    it('should return tool info for uninstalled tool', async () => {
      adapter.setInstalled(false)

      const info = await syncService.getToolInfo(ToolType.TRAE)

      expect(info.type).toBe(ToolType.TRAE)
      expect(info.isInstalled).toBe(false)
      expect(info.skillDirPath).toBeNull()
    })

    it('should throw error for unknown tool type', async () => {
      await expect(syncService.getToolInfo('unknown' as ToolType)).rejects.toThrow()
    })
  })

  describe('getAllToolInfos', () => {
    it('should return all tool infos', async () => {
      const infos = await syncService.getAllToolInfos()
      expect(infos).toHaveLength(1)
      expect(infos[0].type).toBe(ToolType.TRAE)
    })
  })

  describe('syncSkillToTool', () => {
    it('should sync a skill to a tool', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Test Skill',
        description: 'A test skill',
        content: '# Test Content',
        category: 'testing',
        tags: ['test', 'example']
      })

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      const skillDir = join(skillTargetDir, skill.id)
      const skillJsonPath = join(skillDir, 'skill.json')
      const contentPath = join(skillDir, 'content.md')

      const skillJson = JSON.parse(await readFile(skillJsonPath, 'utf-8'))
      expect(skillJson.name).toBe('Test Skill')

      const content = await readFile(contentPath, 'utf-8')
      expect(content).toBe('# Test Content')
    })

    it('should throw error for non-existent skill', async () => {
      await expect(syncService.syncSkillToTool('non-existent-id', ToolType.TRAE)).rejects.toThrow(
        'Skill with id non-existent-id not found'
      )
    })

    it('should throw error for uninstalled tool', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Test Skill',
        description: 'A test skill',
        content: '# Test',
        category: 'test',
        tags: ['test']
      })

      adapter.setInstalled(false)

      await expect(syncService.syncSkillToTool(skill.id, ToolType.TRAE)).rejects.toThrow(
        `Tool ${ToolType.TRAE} is not installed`
      )
    })
  })

  describe('syncSkillToAllTools', () => {
    it('should sync skill to all installed tools', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Test Skill',
        description: 'A test skill',
        content: '# Test',
        category: 'test',
        tags: ['test']
      })

      await syncService.syncSkillToAllTools(skill.id)

      const skillDir = join(skillTargetDir, skill.id)
      const exists = await readFile(join(skillDir, 'skill.json'), 'utf-8')
        .then(() => true)
        .catch(() => false)
      expect(exists).toBe(true)
    })

    it('should skip uninstalled tools', async () => {
      const uninstalledAdapter = new MockAdapter(false, null)
      syncService.registerAdapter(uninstalledAdapter)

      const skill = await skillRepo.createSkill({
        name: 'Test Skill',
        description: 'A test skill',
        content: '# Test',
        category: 'test',
        tags: ['test']
      })

      await expect(syncService.syncSkillToAllTools(skill.id)).resolves.not.toThrow()
    })
  })

  describe('syncAllSkillsToTool', () => {
    it('should sync all skills to a tool', async () => {
      await skillRepo.createSkill({
        name: 'Skill 1',
        description: 'First skill',
        content: 'Content 1',
        category: 'cat1',
        tags: ['tag1']
      })

      await skillRepo.createSkill({
        name: 'Skill 2',
        description: 'Second skill',
        content: 'Content 2',
        category: 'cat2',
        tags: ['tag2']
      })

      await syncService.syncAllSkillsToTool(ToolType.TRAE)

      const skills = await skillRepo.listSkills()
      expect(skills).toHaveLength(2)

      for (const skill of skills) {
        const skillDir = join(skillTargetDir, skill.id)
        const exists = await readFile(join(skillDir, 'skill.json'), 'utf-8')
          .then(() => true)
          .catch(() => false)
        expect(exists).toBe(true)
      }
    })
  })

  describe('syncAllSkillsToAllTools', () => {
    it('should sync all skills to all installed tools', async () => {
      await skillRepo.createSkill({
        name: 'Skill 1',
        description: 'First skill',
        content: 'Content 1',
        category: 'cat1',
        tags: ['tag1']
      })

      await skillRepo.createSkill({
        name: 'Skill 2',
        description: 'Second skill',
        content: 'Content 2',
        category: 'cat2',
        tags: ['tag2']
      })

      await syncService.syncAllSkillsToAllTools()

      const skills = await skillRepo.listSkills()
      for (const skill of skills) {
        const skillDir = join(skillTargetDir, skill.id)
        const exists = await readFile(join(skillDir, 'skill.json'), 'utf-8')
          .then(() => true)
          .catch(() => false)
        expect(exists).toBe(true)
      }
    })
  })

  describe('getSkillSyncStates', () => {
    it('should return unsynced state for skill not synced', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Test Skill',
        description: 'A test skill',
        content: '# Test',
        category: 'test',
        tags: ['test']
      })

      const states = await syncService.getSkillSyncStates(skill.id)
      expect(states).toHaveLength(1)
      expect(states[0].toolType).toBe(ToolType.TRAE)
      expect(states[0].status).toBe(SyncStatus.UNSYNCED)
    })

    it('should return synced state for synced skill', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Test Skill',
        description: 'A test skill',
        content: '# Test',
        category: 'test',
        tags: ['test']
      })

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      const states = await syncService.getSkillSyncStates(skill.id)
      expect(states).toHaveLength(1)
      expect(states[0].status).toBe(SyncStatus.SYNCED)
      expect(states[0].lastSyncAt).toBeDefined()
      expect(states[0].syncedHash).toBeDefined()
    })

    it('should return modified state for modified skill', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Test Skill',
        description: 'A test skill',
        content: '# Original Content',
        category: 'test',
        tags: ['test']
      })

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      await skillRepo.updateSkill(skill.id, { content: '# Modified Content' })

      const states = await syncService.getSkillSyncStates(skill.id)
      expect(states).toHaveLength(1)
      expect(states[0].status).toBe(SyncStatus.MODIFIED)
    })
  })

  describe('getAllSkillsSyncStates', () => {
    it('should return sync states for all skills', async () => {
      const skill1 = await skillRepo.createSkill({
        name: 'Skill 1',
        description: 'First skill',
        content: 'Content 1',
        category: 'cat1',
        tags: ['tag1']
      })

      const skill2 = await skillRepo.createSkill({
        name: 'Skill 2',
        description: 'Second skill',
        content: 'Content 2',
        category: 'cat2',
        tags: ['tag2']
      })

      await syncService.syncSkillToTool(skill1.id, ToolType.TRAE)

      const allStates = await syncService.getAllSkillsSyncStates()

      expect(allStates.size).toBe(2)
      expect(allStates.get(skill1.id)?.[0].status).toBe(SyncStatus.SYNCED)
      expect(allStates.get(skill2.id)?.[0].status).toBe(SyncStatus.UNSYNCED)
    })
  })

  describe('removeSkillFromTool', () => {
    it('should remove skill from tool', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Test Skill',
        description: 'A test skill',
        content: '# Test',
        category: 'test',
        tags: ['test']
      })

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      const skillDir = join(skillTargetDir, skill.id)
      const existsBefore = await readFile(join(skillDir, 'skill.json'), 'utf-8')
        .then(() => true)
        .catch(() => false)
      expect(existsBefore).toBe(true)

      await syncService.removeSkillFromTool(skill.id, ToolType.TRAE)

      const existsAfter = await readFile(join(skillDir, 'skill.json'), 'utf-8')
        .then(() => true)
        .catch(() => false)
      expect(existsAfter).toBe(false)
    })
  })

  describe('sync states persistence', () => {
    it('should save sync states to file', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Test Skill',
        description: 'A test skill',
        content: '# Test',
        category: 'test',
        tags: ['test']
      })

      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)

      const syncStatesPath = join(skillRepoPath, '.skill-hub', 'sync-states.json')
      const content = await readFile(syncStatesPath, 'utf-8')
      const syncStates = JSON.parse(content)

      expect(syncStates).toHaveLength(1)
      expect(syncStates[0].skillId).toBe(skill.id)
      expect(syncStates[0].states).toHaveLength(1)
      expect(syncStates[0].states[0].toolType).toBe(ToolType.TRAE)
      expect(syncStates[0].states[0].status).toBe(SyncStatus.SYNCED)
    })
  })
})
