import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { SkillRepositoryService } from './skillRepository'
import { CategoryService } from './category'
import { GitService } from './git'
import { SyncService } from './syncService'
import { MockAdapter } from './adapters/mock'
import { ToolType } from '@shared/types/adapter'
import { SyncStatus } from '@shared/types/skill'

describe('Error Handling & Edge Cases', () => {
  let tempDir: string
  let toolDir: string
  let skillRepo: SkillRepositoryService
  let categoryService: CategoryService
  let gitService: GitService

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skill-hub-edge-'))
    toolDir = await mkdtemp(join(tmpdir(), 'skill-hub-tool-edge-'))
    skillRepo = new SkillRepositoryService(tempDir)
    categoryService = new CategoryService(tempDir)
    gitService = new GitService(tempDir)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
    await rm(toolDir, { recursive: true, force: true })
  })

  describe('空仓库场景', () => {
    it('空仓库返回空 Skill 列表', async () => {
      await skillRepo.init()
      const skills = await skillRepo.listSkills()
      expect(skills).toEqual([])
      expect(skills.length).toBe(0)
    })

    it('空仓库搜索返回空结果', async () => {
      await skillRepo.init()
      const results = await skillRepo.searchSkills('anything')
      expect(results).toEqual([])
    })

    it('空仓库分类列表为空', async () => {
      const categories = await categoryService.listCategories()
      expect(categories).toEqual([])
    })

    it('空 Git 仓库返回无变更状态', async () => {
      await gitService.init()
      const status = await gitService.getStatus()
      expect(status.isRepo).toBe(true)
      expect(status.hasChanges).toBe(false)
      expect(status.changedFiles).toEqual([])
    })

    it('空 Git 仓库历史为空', async () => {
      await gitService.init()
      const history = await gitService.getHistory()
      expect(history).toEqual([])
    })
  })

  describe('无效路径场景', () => {
    it('Skill 仓库初始化时自动创建不存在的目录', async () => {
      const nonExistentDir = join(tempDir, 'non-existent', 'subdir')
      const service = new SkillRepositoryService(nonExistentDir)
      await service.init()
      const initialized = await service.isInitialized()
      expect(initialized).toBe(true)
    })

    it('Git 服务对不存在的路径抛出错误', async () => {
      const invalidService = new GitService('/invalid/path/that/does/not/exist')
      await expect(invalidService.init()).rejects.toThrow()
    })

    it('获取不存在的 Skill 返回 null', async () => {
      await skillRepo.init()
      const skill = await skillRepo.getSkill('non-existent-id')
      expect(skill).toBeNull()
    })

    it('更新不存在的 Skill 抛出错误', async () => {
      await skillRepo.init()
      await expect(skillRepo.updateSkill('non-existent-id', { name: 'Test' })).rejects.toThrow(
        'not found'
      )
    })

    it('删除不存在的 Skill 不抛出错误', async () => {
      await skillRepo.init()
      await expect(skillRepo.deleteSkill('non-existent-id')).resolves.not.toThrow()
    })

    it('更新不存在的分类抛出错误', async () => {
      await expect(
        categoryService.updateCategory('non-existent-id', { name: 'Test' })
      ).rejects.toThrow('not found')
    })

    it('删除不存在的分类不抛出错误', async () => {
      await expect(categoryService.deleteCategory('non-existent-id')).resolves.not.toThrow()
    })
  })

  describe('特殊字符 Skill 名称', () => {
    it('支持中文名称', async () => {
      await skillRepo.init()
      const skill = await skillRepo.createSkill({
        name: '测试技能',
        description: '这是一个测试技能',
        content: '# 测试内容',
        category: '测试',
        tags: ['测试', '中文']
      })

      const fetched = await skillRepo.getSkill(skill.id)
      expect(fetched).toBeDefined()
      expect(fetched!.name).toBe('测试技能')
      expect(fetched!.description).toBe('这是一个测试技能')
      expect(fetched!.category).toBe('测试')
      expect(fetched!.tags).toEqual(['测试', '中文'])
    })

    it('支持特殊字符名称', async () => {
      await skillRepo.init()
      const skill = await skillRepo.createSkill({
        name: 'Test @#$%^&*() Skill',
        description: 'Description with special chars: !@#$%^&*()',
        content: '# Content with special chars: <>&"\'`',
        category: 'special-chars',
        tags: ['tag-with-dashes', 'tag_with_underscores', 'tag.with.dots']
      })

      const fetched = await skillRepo.getSkill(skill.id)
      expect(fetched).toBeDefined()
      expect(fetched!.name).toBe('Test @#$%^&*() Skill')
    })

    it('支持长名称', async () => {
      await skillRepo.init()
      const longName = 'A'.repeat(200)
      const skill = await skillRepo.createSkill({
        name: longName,
        description: 'Long name test',
        content: '# Content',
        category: 'long-names',
        tags: ['long']
      })

      const fetched = await skillRepo.getSkill(skill.id)
      expect(fetched).toBeDefined()
      expect(fetched!.name).toBe(longName)
    })

    it('支持空格和换行的内容', async () => {
      await skillRepo.init()
      const content = `# Title

Line 1
Line 2

  Indented line

\`\`\`
Code block
\`\`\`

- List item 1
- List item 2
`
      const skill = await skillRepo.createSkill({
        name: 'Whitespace Test',
        description: 'Testing whitespace handling',
        content,
        category: 'whitespace',
        tags: ['whitespace']
      })

      const fetched = await skillRepo.getSkill(skill.id)
      expect(fetched).toBeDefined()
      expect(fetched!.content).toBe(content)
    })
  })

  describe('空值和边界值', () => {
    it('空标签数组', async () => {
      await skillRepo.init()
      const skill = await skillRepo.createSkill({
        name: 'No Tags',
        description: 'Skill with no tags',
        content: '# Content',
        category: 'test',
        tags: []
      })

      const fetched = await skillRepo.getSkill(skill.id)
      expect(fetched).toBeDefined()
      expect(fetched!.tags).toEqual([])
    })

    it('空描述', async () => {
      await skillRepo.init()
      const skill = await skillRepo.createSkill({
        name: 'No Description',
        description: '',
        content: '# Content',
        category: 'test',
        tags: ['test']
      })

      const fetched = await skillRepo.getSkill(skill.id)
      expect(fetched).toBeDefined()
      expect(fetched!.description).toBe('')
    })

    it('空内容', async () => {
      await skillRepo.init()
      const skill = await skillRepo.createSkill({
        name: 'No Content',
        description: 'Skill with no content',
        content: '',
        category: 'test',
        tags: ['test']
      })

      const fetched = await skillRepo.getSkill(skill.id)
      expect(fetched).toBeDefined()
      expect(fetched!.content).toBe('')
    })

    it('空字符串搜索返回所有结果', async () => {
      await skillRepo.init()
      await skillRepo.createSkill({
        name: 'Skill 1',
        description: 'First skill',
        content: '# Content 1',
        category: 'test',
        tags: ['test']
      })
      await skillRepo.createSkill({
        name: 'Skill 2',
        description: 'Second skill',
        content: '# Content 2',
        category: 'test',
        tags: ['test']
      })

      const results = await skillRepo.searchSkills('')
      expect(results.length).toBe(2)
    })

    it('空格搜索返回所有结果', async () => {
      await skillRepo.init()
      await skillRepo.createSkill({
        name: 'Skill 1',
        description: 'First skill',
        content: '# Content 1',
        category: 'test',
        tags: ['test']
      })

      const results = await skillRepo.searchSkills('   ')
      expect(results.length).toBe(1)
    })
  })

  describe('同步服务边界情况', () => {
    it('同步不存在的 Skill 抛出错误', async () => {
      await skillRepo.init()
      const syncService = new SyncService(tempDir, [new MockAdapter(true, toolDir)])
      await expect(syncService.syncSkillToTool('non-existent-id', ToolType.TRAE)).rejects.toThrow(
        'not found'
      )
    })

    it('工具未安装时同步状态为未同步', async () => {
      await skillRepo.init()
      const skill = await skillRepo.createSkill({
        name: 'Test',
        description: 'Test',
        content: '# Test',
        category: 'test',
        tags: ['test']
      })

      const mockAdapter = new MockAdapter(false, null)
      const syncService = new SyncService(tempDir, [mockAdapter])

      const states = await syncService.getSkillSyncStates(skill.id)
      expect(states.length).toBe(1)
      expect(states[0].status).toBe(SyncStatus.UNSYNCED)
    })

    it('同步到未安装的工具抛出错误', async () => {
      await skillRepo.init()
      const skill = await skillRepo.createSkill({
        name: 'Test',
        description: 'Test',
        content: '# Test',
        category: 'test',
        tags: ['test']
      })

      const mockAdapter = new MockAdapter(false, null)
      const syncService = new SyncService(tempDir, [mockAdapter])

      await expect(syncService.syncSkillToTool(skill.id, ToolType.TRAE)).rejects.toThrow(
        'not installed'
      )
    })

    it('批量同步空仓库不抛出错误', async () => {
      await skillRepo.init()
      const syncService = new SyncService(tempDir, [new MockAdapter(true, toolDir)])
      await expect(syncService.syncAllSkillsToTool(ToolType.TRAE)).resolves.not.toThrow()
    })
  })

  describe('Git 边界情况', () => {
    it('回滚到不存在的提交抛出错误', async () => {
      await gitService.init()
      await writeFile(join(tempDir, 'test.txt'), 'content')
      await gitService.commit('Initial commit')

      await expect(gitService.rollback('nonexistentcommithash1234567890')).rejects.toThrow()
    })

    it('获取不存在的提交返回 null', async () => {
      await gitService.init()
      const commit = await gitService.getCommit('nonexistentcommithash1234567890')
      expect(commit).toBeNull()
    })

    it('提交空工作区抛出错误', async () => {
      await gitService.init()
      await expect(gitService.commit('Empty commit')).rejects.toThrow()
    })
  })

  describe('并发操作场景', () => {
    it('并发创建多个 Skill', async () => {
      await skillRepo.init()

      const skills = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          skillRepo.createSkill({
            name: `Concurrent Skill ${i}`,
            description: `Description ${i}`,
            content: `# Content ${i}`,
            category: 'concurrent',
            tags: [`tag${i}`]
          })
        )
      )

      expect(skills.length).toBe(10)

      const allSkills = await skillRepo.listSkills()
      expect(allSkills.length).toBe(10)
    })

    it('并发读取 Skill', async () => {
      await skillRepo.init()
      const skill = await skillRepo.createSkill({
        name: 'Concurrent Read',
        description: 'Test concurrent reads',
        content: '# Content',
        category: 'test',
        tags: ['concurrent']
      })

      const reads = await Promise.all(
        Array.from({ length: 20 }, () => skillRepo.getSkill(skill.id))
      )

      expect(reads.length).toBe(20)
      reads.forEach((r) => {
        expect(r).toBeDefined()
        expect(r!.id).toBe(skill.id)
      })
    })

    it('并发更新 Skill', async () => {
      await skillRepo.init()
      const skill = await skillRepo.createSkill({
        name: 'Concurrent Update',
        description: 'Test concurrent updates',
        content: '# Original',
        category: 'test',
        tags: ['concurrent']
      })

      const updates = await Promise.allSettled(
        Array.from({ length: 5 }, (_, i) =>
          skillRepo.updateSkill(skill.id, {
            name: `Updated ${i}`,
            content: `# Updated Content ${i}`
          })
        )
      )

      const successfulUpdates = updates.filter((u) => u.status === 'fulfilled')
      expect(successfulUpdates.length).toBeGreaterThan(0)

      const finalSkill = await skillRepo.getSkill(skill.id)
      expect(finalSkill).toBeDefined()
      expect(finalSkill!.updatedAt).toBeGreaterThan(skill.updatedAt)
    })
  })
})
