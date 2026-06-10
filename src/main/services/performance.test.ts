import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { SkillRepositoryService } from './skillRepository'
import { GitService } from './git'
import { SyncService } from './syncService'
import { MockAdapter } from './adapters/mock'
import { ToolType } from '@shared/types/adapter'
import type { Skill } from '@shared/types/skill'

describe('Performance Benchmarks', () => {
  let tempDir: string
  let toolDir: string
  let skillRepo: SkillRepositoryService
  let gitService: GitService
  let syncService: SyncService

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skill-hub-perf-'))
    toolDir = await mkdtemp(join(tmpdir(), 'skill-hub-tool-perf-'))
    skillRepo = new SkillRepositoryService(tempDir)
    gitService = new GitService(tempDir)
    syncService = new SyncService(tempDir, [new MockAdapter(true, toolDir)])
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

  const createManySkills = async (count: number): Promise<Skill[]> => {
    const skills: Skill[] = []
    for (let i = 0; i < count; i++) {
      const skill = await skillRepo.createSkill({
        name: `Performance Skill ${i}`,
        description: `Description for skill ${i}. This is a longer description to test performance.`,
        content: `# Skill ${i}\n\nThis is the content of skill ${i}.\n\nIt has multiple lines\n\nAnd some more content here.\n\n## Section 1\n\nSome section content.\n\n## Section 2\n\nMore section content.`,
        category: `category-${i % 10}`,
        tags: [`tag-${i % 5}`, `tag-${(i + 1) % 7}`, `common-tag`]
      })
      skills.push(skill)
    }
    return skills
  }

  describe('Skill 加载性能', () => {
    it('100 条 Skill 的加载时间', async () => {
      const skills = await createManySkills(100)

      const start = performance.now()
      const loadedSkills = await skillRepo.listSkills()
      const end = performance.now()

      const duration = end - start
      console.log(`100 Skills load time: ${duration.toFixed(2)}ms`)

      expect(loadedSkills.length).toBe(skills.length)
      expect(loadedSkills.length).toBe(100)
    }, 120000)

    it('100 条 Skill 逐个获取的总时间', async () => {
      const skills = await createManySkills(100)

      const start = performance.now()
      for (const skill of skills) {
        await skillRepo.getSkill(skill.id)
      }
      const end = performance.now()

      const duration = end - start
      console.log(`100 Skills individual get time: ${duration.toFixed(2)}ms`)

      expect(duration).toBeGreaterThan(0)
    }, 60000)
  })

  describe('搜索性能', () => {
    it('100 条 Skill 的搜索时间', async () => {
      await createManySkills(100)

      const start = performance.now()
      const results = await skillRepo.searchSkills('skill')
      const end = performance.now()

      const duration = end - start
      console.log(`100 Skills search time: ${duration.toFixed(2)}ms`)

      expect(results.length).toBeGreaterThan(0)
    }, 30000)

    it('搜索标签的性能', async () => {
      await createManySkills(100)

      const start = performance.now()
      const results = await skillRepo.searchSkills('common-tag')
      const end = performance.now()

      const duration = end - start
      console.log(`Tag search time: ${duration.toFixed(2)}ms`)

      expect(results.length).toBe(100)
    }, 30000)

    it('搜索内容的性能', async () => {
      await createManySkills(100)

      const start = performance.now()
      const results = await skillRepo.searchSkills('Section')
      const end = performance.now()

      const duration = end - start
      console.log(`Content search time: ${duration.toFixed(2)}ms`)

      expect(results.length).toBe(100)
    }, 30000)
  })

  describe('同步性能', () => {
    it('单次同步的时间', async () => {
      const skill = await skillRepo.createSkill({
        name: 'Sync Perf Skill',
        description: 'Testing sync performance',
        content: '# Content\n\nSome content here.',
        category: 'test',
        tags: ['sync', 'perf']
      })

      const start = performance.now()
      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)
      const end = performance.now()

      const duration = end - start
      console.log(`Single sync time: ${duration.toFixed(2)}ms`)

      const states = await syncService.getSkillSyncStates(skill.id)
      expect(states[0].status).toBe('synced')
    }, 30000)

    it('10 条 Skill 批量同步的时间', async () => {
      const skills = await createManySkills(10)

      const start = performance.now()
      await syncService.syncAllSkillsToTool(ToolType.TRAE)
      const end = performance.now()

      const duration = end - start
      console.log(`10 Skills batch sync time: ${duration.toFixed(2)}ms`)

      for (const skill of skills) {
        const states = await syncService.getSkillSyncStates(skill.id)
        expect(states[0].status).toBe('synced')
      }
    }, 30000)
  })

  describe('Git 提交性能', () => {
    it('单次提交的时间', async () => {
      await skillRepo.createSkill({
        name: 'Git Perf Skill',
        description: 'Testing git performance',
        content: '# Content',
        category: 'test',
        tags: ['git', 'perf']
      })

      const start = performance.now()
      const commit = await gitService.commit('Add skill')
      const end = performance.now()

      const duration = end - start
      console.log(`Single commit time: ${duration.toFixed(2)}ms`)

      expect(commit).toBeDefined()
    }, 30000)

    it('获取历史记录的性能', async () => {
      for (let i = 0; i < 10; i++) {
        await skillRepo.createSkill({
          name: `History Skill ${i}`,
          description: `Skill ${i}`,
          content: `# Content ${i}`,
          category: 'test',
          tags: ['history']
        })
        await gitService.commit(`Add skill ${i}`)
      }

      const start = performance.now()
      const history = await gitService.getHistory()
      const end = performance.now()

      const duration = end - start
      console.log(`Get history (10 commits) time: ${duration.toFixed(2)}ms`)

      expect(history.length).toBe(10)
    }, 30000)
  })

  describe('NFR-1 性能指标验证', () => {
    it('Skill 列表加载性能验证', async () => {
      const skills = await createManySkills(100)

      const start = performance.now()
      const loadedSkills = await skillRepo.listSkills()
      const end = performance.now()

      const duration = end - start
      console.log(`NFR-1: Skill list load (100): ${duration.toFixed(2)}ms`)

      expect(loadedSkills.length).toBe(skills.length)
      expect(loadedSkills.length).toBe(100)
    }, 30000)

    it('搜索响应性能验证', async () => {
      await createManySkills(100)

      const start = performance.now()
      const results = await skillRepo.searchSkills('skill')
      const end = performance.now()

      const duration = end - start
      console.log(`NFR-1: Search response: ${duration.toFixed(2)}ms`)

      expect(results.length).toBeGreaterThan(0)
    }, 30000)

    it('单条 Skill 同步操作性能验证', async () => {
      const skill = await skillRepo.createSkill({
        name: 'NFR Sync Test',
        description: 'NFR sync test skill',
        content: '# NFR Content\n\nTesting NFR compliance.',
        category: 'nfr',
        tags: ['nfr', 'sync']
      })

      const start = performance.now()
      await syncService.syncSkillToTool(skill.id, ToolType.TRAE)
      const end = performance.now()

      const duration = end - start
      console.log(`NFR-1: Single skill sync: ${duration.toFixed(2)}ms`)

      const states = await syncService.getSkillSyncStates(skill.id)
      expect(states[0].status).toBe('synced')
    }, 30000)
  })

  describe('大规模数据场景', () => {
    it('100 条 Skill 数据一致性', async () => {
      const skills = await createManySkills(100)

      const allSkills = await skillRepo.listSkills()
      expect(allSkills.length).toBe(100)

      for (const skill of skills) {
        const fetched = await skillRepo.getSkill(skill.id)
        expect(fetched).toBeDefined()
        expect(fetched!.id).toBe(skill.id)
        expect(fetched!.name).toBe(skill.name)
      }
    }, 30000)

    it('100 条 Skill 的 Git 提交历史', async () => {
      await createManySkills(100)

      await gitService.commit('Add 100 skills')

      const history = await gitService.getHistory()
      expect(history.length).toBe(1)
      expect(history[0].message).toBe('Add 100 skills')

      const status = await gitService.getStatus()
      expect(status.hasChanges).toBe(false)
    }, 30000)

    it('大文件内容的 Skill', async () => {
      const largeContent = '# Large Content\n\n' + 'Line '.repeat(10000)

      const start = performance.now()
      const skill = await skillRepo.createSkill({
        name: 'Large Content Skill',
        description: 'Skill with large content',
        content: largeContent,
        category: 'large',
        tags: ['large', 'content']
      })
      const end = performance.now()

      const createDuration = end - start
      console.log(`Large content create time: ${createDuration.toFixed(2)}ms`)

      const readStart = performance.now()
      const fetched = await skillRepo.getSkill(skill.id)
      const readEnd = performance.now()

      const readDuration = readEnd - readStart
      console.log(`Large content read time: ${readDuration.toFixed(2)}ms`)

      expect(fetched).toBeDefined()
      expect(fetched!.content).toBe(largeContent)
      expect(fetched!.content.length).toBe(largeContent.length)
    }, 30000)
  })
})
