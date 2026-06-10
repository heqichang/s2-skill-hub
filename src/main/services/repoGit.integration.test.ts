import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { SkillRepositoryService } from './skillRepository'
import { GitService } from './git'

describe('Repo + Git Integration', () => {
  let tempDir: string
  let skillRepo: SkillRepositoryService
  let gitService: GitService

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skill-hub-repo-git-test-'))
    skillRepo = new SkillRepositoryService(tempDir)
    gitService = new GitService(tempDir)
    await skillRepo.init()
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('初始化', () => {
    it('初始化仓库后自动创建 Git 仓库', async () => {
      expect(await gitService.isRepo()).toBe(false)

      await gitService.init()

      expect(await gitService.isRepo()).toBe(true)

      const status = await gitService.getStatus()
      expect(status.isRepo).toBe(true)
      expect(status.hasChanges).toBe(false)
    })
  })

  describe('创建 Skill 后 Git 状态', () => {
    it('创建 Skill 后 Git 状态显示变更', async () => {
      await gitService.init()

      let status = await gitService.getStatus()
      expect(status.hasChanges).toBe(false)

      await skillRepo.createSkill({
        name: 'Test Skill',
        description: 'A test skill',
        content: '# Test Content',
        category: 'testing',
        tags: ['test']
      })

      status = await gitService.getStatus()
      expect(status.hasChanges).toBe(true)
      expect(status.changedFiles.length).toBeGreaterThan(0)

      const skillDirs = await readdir(join(tempDir, 'skills'))
      expect(skillDirs.length).toBe(1)

      const skillFiles = status.changedFiles.filter((f) => f.file.startsWith('skills/'))
      expect(skillFiles.length).toBeGreaterThan(0)
      skillFiles.forEach((f) => {
        expect(f.status).toBe('added')
      })
    })
  })

  describe('提交变更后 Git 历史', () => {
    it('提交变更后 Git 历史增加记录', async () => {
      await gitService.init()

      await skillRepo.createSkill({
        name: 'Test Skill',
        description: 'A test skill',
        content: '# Test Content',
        category: 'testing',
        tags: ['test']
      })

      let history = await gitService.getHistory()
      expect(history.length).toBe(0)

      const commit = await gitService.commit('Add test skill')

      expect(commit).toBeDefined()
      expect(commit.message).toBe('Add test skill')

      history = await gitService.getHistory()
      expect(history.length).toBe(1)
      expect(history[0].hash).toBe(commit.hash)
      expect(history[0].message).toBe('Add test skill')
    })
  })

  describe('多次操作后提交历史', () => {
    it('多次创建/更新/删除 Skill 后提交历史正确', async () => {
      await gitService.init()

      const skill1 = await skillRepo.createSkill({
        name: 'Skill 1',
        description: 'First skill',
        content: '# Content 1',
        category: 'cat1',
        tags: ['tag1']
      })
      await gitService.commit('Add skill 1')

      const skill2 = await skillRepo.createSkill({
        name: 'Skill 2',
        description: 'Second skill',
        content: '# Content 2',
        category: 'cat2',
        tags: ['tag2']
      })
      await gitService.commit('Add skill 2')

      await skillRepo.updateSkill(skill1.id, {
        name: 'Skill 1 Updated',
        content: '# Updated Content 1'
      })
      await gitService.commit('Update skill 1')

      await skillRepo.deleteSkill(skill2.id)
      await gitService.commit('Delete skill 2')

      const history = await gitService.getHistory()
      expect(history.length).toBe(4)

      expect(history[0].message).toBe('Delete skill 2')
      expect(history[1].message).toBe('Update skill 1')
      expect(history[2].message).toBe('Add skill 2')
      expect(history[3].message).toBe('Add skill 1')

      const skills = await skillRepo.listSkills()
      expect(skills.length).toBe(1)
      expect(skills[0].id).toBe(skill1.id)
      expect(skills[0].name).toBe('Skill 1 Updated')
    })
  })

  describe('回滚到指定版本', () => {
    it('回滚到指定版本后文件内容正确恢复', async () => {
      await gitService.init()

      const skill = await skillRepo.createSkill({
        name: 'Original Name',
        description: 'Original description',
        content: '# Original Content',
        category: 'original',
        tags: ['original']
      })
      const commit1 = await gitService.commit('Initial version')

      await skillRepo.updateSkill(skill.id, {
        name: 'Updated Name',
        content: '# Updated Content'
      })
      await gitService.commit('Updated version')

      const updatedSkill = await skillRepo.getSkill(skill.id)
      expect(updatedSkill?.name).toBe('Updated Name')
      expect(updatedSkill?.content).toBe('# Updated Content')

      await gitService.rollback(commit1.hash)

      const rolledBackSkill = await skillRepo.getSkill(skill.id)
      expect(rolledBackSkill?.name).toBe('Original Name')
      expect(rolledBackSkill?.description).toBe('Original description')
      expect(rolledBackSkill?.content.replace(/\r\n/g, '\n')).toBe('# Original Content')
      expect(rolledBackSkill?.category).toBe('original')
      expect(rolledBackSkill?.tags).toEqual(['original'])
    })
  })

  describe('数据一致性验证', () => {
    it('验证文件系统 vs 服务返回 vs Git 状态一致性', async () => {
      await gitService.init()

      const skill = await skillRepo.createSkill({
        name: 'Consistency Test',
        description: 'Testing consistency',
        content: '# Consistency Content\n\nLine 2',
        category: 'consistency',
        tags: ['test', 'consistency']
      })

      const skillDir = join(tempDir, 'skills', skill.id)
      const files = await readdir(skillDir)
      expect(files).toContain('skill.json')
      expect(files).toContain('content.md')

      const metadataRaw = await readFile(join(skillDir, 'skill.json'), 'utf-8')
      const metadata = JSON.parse(metadataRaw)
      expect(metadata.id).toBe(skill.id)
      expect(metadata.name).toBe(skill.name)
      expect(metadata.description).toBe(skill.description)
      expect(metadata.category).toBe(skill.category)
      expect(metadata.tags).toEqual(skill.tags)
      expect(metadata.createdAt).toBe(skill.createdAt)
      expect(metadata.updatedAt).toBe(skill.updatedAt)

      const content = await readFile(join(skillDir, 'content.md'), 'utf-8')
      expect(content).toBe(skill.content)

      const fetchedSkill = await skillRepo.getSkill(skill.id)
      expect(fetchedSkill).toEqual(skill)

      const gitStatus = await gitService.getStatus()
      expect(gitStatus.hasChanges).toBe(true)

      const skillFiles = gitStatus.changedFiles.filter((f) =>
        f.file.includes(skill.id.substring(0, 8))
      )
      expect(skillFiles.length).toBeGreaterThanOrEqual(2)

      await gitService.commit('Commit skill')

      const statusAfterCommit = await gitService.getStatus()
      expect(statusAfterCommit.hasChanges).toBe(false)

      const history = await gitService.getHistory()
      expect(history.length).toBe(1)
      expect(history[0].message).toBe('Commit skill')
    })
  })
})
