import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { GitService } from './git'

describe('GitService', () => {
  let tempDir: string
  let service: GitService

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skill-hub-git-test-'))
    service = new GitService(tempDir)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('init', () => {
    it('should initialize a git repository', async () => {
      await service.init()
      const isRepo = await service.isRepo()
      expect(isRepo).toBe(true)
    })

    it('should throw error for invalid path', async () => {
      const invalidService = new GitService('/invalid/path/that/does/not/exist')
      await expect(invalidService.init()).rejects.toThrow()
    })
  })

  describe('isRepo', () => {
    it('should return false for non-git directory', async () => {
      const isRepo = await service.isRepo()
      expect(isRepo).toBe(false)
    })

    it('should return true after initialization', async () => {
      await service.init()
      const isRepo = await service.isRepo()
      expect(isRepo).toBe(true)
    })
  })

  describe('getStatus', () => {
    it('should return non-repo status for uninitialized directory', async () => {
      const status = await service.getStatus()
      expect(status.isRepo).toBe(false)
      expect(status.hasChanges).toBe(false)
      expect(status.changedFiles).toEqual([])
    })

    it('should return clean status for initialized repo with no changes', async () => {
      await service.init()
      const status = await service.getStatus()
      expect(status.isRepo).toBe(true)
      expect(status.hasChanges).toBe(false)
      expect(status.changedFiles).toEqual([])
    })

    it('should detect added files', async () => {
      await service.init()
      await writeFile(join(tempDir, 'test.txt'), 'hello world')
      const status = await service.getStatus()
      expect(status.isRepo).toBe(true)
      expect(status.hasChanges).toBe(true)
      expect(status.changedFiles.length).toBeGreaterThan(0)
      const testFile = status.changedFiles.find((f) => f.file === 'test.txt')
      expect(testFile).toBeDefined()
      expect(testFile?.status).toBe('added')
    })

    it('should detect modified files', async () => {
      await service.init()
      await writeFile(join(tempDir, 'test.txt'), 'initial content')
      await service.commit('Initial commit')
      await writeFile(join(tempDir, 'test.txt'), 'modified content')
      const status = await service.getStatus()
      expect(status.hasChanges).toBe(true)
      const testFile = status.changedFiles.find((f) => f.file === 'test.txt')
      expect(testFile).toBeDefined()
      expect(testFile?.status).toBe('modified')
    })

    it('should detect deleted files', async () => {
      await service.init()
      await writeFile(join(tempDir, 'test.txt'), 'content')
      await service.commit('Initial commit')
      await rm(join(tempDir, 'test.txt'))
      const status = await service.getStatus()
      expect(status.hasChanges).toBe(true)
      const testFile = status.changedFiles.find((f) => f.file === 'test.txt')
      expect(testFile).toBeDefined()
      expect(testFile?.status).toBe('deleted')
    })
  })

  describe('commit', () => {
    it('should commit all changes with default author', async () => {
      await service.init()
      await writeFile(join(tempDir, 'test.txt'), 'hello world')
      const commit = await service.commit('Test commit')

      expect(commit.hash).toBeDefined()
      expect(commit.shortHash).toBeDefined()
      expect(commit.shortHash.length).toBe(7)
      expect(commit.message).toBe('Test commit')
      expect(commit.author).toBe('Skill Hub')
      expect(commit.email).toBe('skill-hub@example.com')
      expect(commit.date).toBeGreaterThan(0)
    })

    it('should commit with custom author', async () => {
      await service.init()
      await writeFile(join(tempDir, 'test.txt'), 'hello world')
      const commit = await service.commit('Test commit', {
        name: 'Test User',
        email: 'test@example.com'
      })

      expect(commit.author).toBe('Test User')
      expect(commit.email).toBe('test@example.com')
    })

    it('should auto add all changes before commit', async () => {
      await service.init()
      await writeFile(join(tempDir, 'file1.txt'), 'content 1')
      await writeFile(join(tempDir, 'file2.txt'), 'content 2')

      const commit = await service.commit('Add two files')
      expect(commit.hash).toBeDefined()

      const status = await service.getStatus()
      expect(status.hasChanges).toBe(false)
    })

    it('should throw error when not a git repo', async () => {
      await writeFile(join(tempDir, 'test.txt'), 'content')
      await expect(service.commit('Test')).rejects.toThrow()
    })
  })

  describe('getHistory', () => {
    it('should return empty history for repo with no commits', async () => {
      await service.init()
      const history = await service.getHistory()
      expect(history).toEqual([])
    })

    it('should return commit history in reverse chronological order', async () => {
      await service.init()

      await writeFile(join(tempDir, 'file1.txt'), 'content 1')
      const commit1 = await service.commit('First commit')

      await new Promise((resolve) => setTimeout(resolve, 10))

      await writeFile(join(tempDir, 'file2.txt'), 'content 2')
      const commit2 = await service.commit('Second commit')

      await new Promise((resolve) => setTimeout(resolve, 10))

      await writeFile(join(tempDir, 'file3.txt'), 'content 3')
      const commit3 = await service.commit('Third commit')

      const history = await service.getHistory()

      expect(history).toHaveLength(3)
      expect(history[0].hash).toBe(commit3.hash)
      expect(history[1].hash).toBe(commit2.hash)
      expect(history[2].hash).toBe(commit1.hash)
    })

    it('should respect limit parameter', async () => {
      await service.init()

      for (let i = 0; i < 5; i++) {
        await writeFile(join(tempDir, `file${i}.txt`), `content ${i}`)
        await service.commit(`Commit ${i}`)
      }

      const history = await service.getHistory(2)
      expect(history).toHaveLength(2)
    })

    it('should throw error when not a git repo', async () => {
      await expect(service.getHistory()).rejects.toThrow()
    })
  })

  describe('getCommit', () => {
    it('should return commit by hash', async () => {
      await service.init()
      await writeFile(join(tempDir, 'test.txt'), 'content')
      const created = await service.commit('Test commit')

      const fetched = await service.getCommit(created.hash)
      expect(fetched).not.toBeNull()
      expect(fetched?.hash).toBe(created.hash)
      expect(fetched?.message).toBe('Test commit')
      expect(fetched?.shortHash).toBe(created.hash.substring(0, 7))
    })

    it('should return null for non-existent commit', async () => {
      await service.init()
      await writeFile(join(tempDir, 'test.txt'), 'content')
      await service.commit('Test commit')

      const commit = await service.getCommit('0000000000000000000000000000000000000000')
      expect(commit).toBeNull()
    })

    it('should throw error when not a git repo', async () => {
      await expect(service.getCommit('abc123')).rejects.toThrow()
    })
  })

  describe('getDiff', () => {
    it('should return working diff when no hash provided', async () => {
      await service.init()
      await writeFile(join(tempDir, 'test.txt'), 'initial')
      await service.commit('Initial')

      await writeFile(join(tempDir, 'test.txt'), 'modified content')
      const diff = await service.getDiff()

      expect(diff.length).toBeGreaterThan(0)
      const testFile = diff.find((f) => f.file === 'test.txt')
      expect(testFile).toBeDefined()
    })

    it('should return commit diff when hash provided', async () => {
      await service.init()
      await writeFile(join(tempDir, 'test.txt'), 'initial content')
      const commit = await service.commit('Initial commit')

      const diff = await service.getDiff(commit.hash)
      expect(diff.length).toBeGreaterThan(0)
      const testFile = diff.find((f) => f.file === 'test.txt')
      expect(testFile).toBeDefined()
      expect(testFile?.status).toBe('added')
      expect(testFile?.additions).toBeGreaterThan(0)
    })

    it('should return empty array when no changes', async () => {
      await service.init()
      await writeFile(join(tempDir, 'test.txt'), 'content')
      await service.commit('Initial')

      const diff = await service.getDiff()
      expect(diff).toEqual([])
    })

    it('should detect added files in diff', async () => {
      await service.init()
      await writeFile(join(tempDir, 'newfile.txt'), 'new content')
      const commit = await service.commit('Add new file')

      const diff = await service.getDiff(commit.hash)
      const newFile = diff.find((f) => f.file === 'newfile.txt')
      expect(newFile).toBeDefined()
      expect(newFile?.status).toBe('added')
    })

    it('should detect deleted files in diff', async () => {
      await service.init()
      await writeFile(join(tempDir, 'todelete.txt'), 'delete me')
      await service.commit('Add file to delete')

      await rm(join(tempDir, 'todelete.txt'))
      const deleteCommit = await service.commit('Delete file')

      const diff = await service.getDiff(deleteCommit.hash)
      const deletedFile = diff.find((f) => f.file === 'todelete.txt')
      expect(deletedFile).toBeDefined()
      expect(deletedFile?.status).toBe('deleted')
    })
  })

  describe('getFileDiff', () => {
    it('should return unified diff for a file', async () => {
      await service.init()
      await writeFile(join(tempDir, 'test.txt'), 'line 1\nline 2\nline 3')
      await service.commit('Initial')

      await writeFile(join(tempDir, 'test.txt'), 'line 1\nmodified line\nline 3')
      const diff = await service.getFileDiff('test.txt')

      expect(diff).toContain('test.txt')
      expect(diff).toContain('+modified line')
      expect(diff).toContain('-line 2')
    })

    it('should return commit file diff when hash provided', async () => {
      await service.init()
      await writeFile(join(tempDir, 'test.txt'), 'initial content')
      const commit = await service.commit('Initial commit')

      const diff = await service.getFileDiff('test.txt', commit.hash)
      expect(diff).toContain('test.txt')
      expect(diff).toContain('+initial content')
    })

    it('should return empty string for unchanged file', async () => {
      await service.init()
      await writeFile(join(tempDir, 'test.txt'), 'content')
      await service.commit('Initial')

      const diff = await service.getFileDiff('test.txt')
      expect(diff).toBe('')
    })
  })

  describe('rollback', () => {
    it('should rollback to specified commit', async () => {
      await service.init()

      await writeFile(join(tempDir, 'file.txt'), 'version 1')
      const commit1 = await service.commit('Version 1')

      await writeFile(join(tempDir, 'file.txt'), 'version 2')
      await service.commit('Version 2')

      await writeFile(join(tempDir, 'file.txt'), 'version 3')
      await service.commit('Version 3')

      await service.rollback(commit1.hash)

      const history = await service.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].hash).toBe(commit1.hash)
    })

    it('should hard reset working directory changes', async () => {
      await service.init()

      await writeFile(join(tempDir, 'file.txt'), 'original content')
      const commit = await service.commit('Original')

      await writeFile(join(tempDir, 'file.txt'), 'modified content')

      const statusBefore = await service.getStatus()
      expect(statusBefore.hasChanges).toBe(true)

      await service.rollback(commit.hash)

      const statusAfter = await service.getStatus()
      expect(statusAfter.hasChanges).toBe(false)

      const content = await readFile(join(tempDir, 'file.txt'), 'utf-8')
      expect(content).toBe('original content')
    })

    it('should throw error for invalid commit', async () => {
      await service.init()
      await writeFile(join(tempDir, 'test.txt'), 'content')
      await service.commit('Initial')

      await expect(service.rollback('0000000000000000000000000000000000000000')).rejects.toThrow()
    })
  })

  describe('skill files scenario', () => {
    it('should handle skill repository structure', async () => {
      await service.init()

      const skillsDir = join(tempDir, 'skills')
      await mkdir(skillsDir, { recursive: true })

      const skillDir = join(skillsDir, 'test-skill')
      await mkdir(skillDir, { recursive: true })

      await writeFile(
        join(skillDir, 'skill.json'),
        JSON.stringify({
          id: 'test-skill',
          name: 'Test Skill',
          description: 'A test skill',
          category: 'testing',
          tags: ['test']
        })
      )
      await writeFile(join(skillDir, 'content.md'), '# Test Skill\n\nThis is a test skill.')

      const commit = await service.commit('Add test skill', {
        name: 'Skill Author',
        email: 'author@skills.com'
      })

      expect(commit.hash).toBeDefined()
      expect(commit.message).toBe('Add test skill')

      const diff = await service.getDiff(commit.hash)
      const jsonFile = diff.find((f) => f.file.includes('skill.json'))
      const mdFile = diff.find((f) => f.file.includes('content.md'))
      expect(jsonFile).toBeDefined()
      expect(mdFile).toBeDefined()
    })

    it('should track skill modifications', async () => {
      await service.init()

      const skillsDir = join(tempDir, 'skills')
      await mkdir(skillsDir, { recursive: true })

      const skillDir = join(skillsDir, 'python-skill')
      await mkdir(skillDir, { recursive: true })

      await writeFile(
        join(skillDir, 'skill.json'),
        JSON.stringify({
          id: 'python-skill',
          name: 'Python Skill',
          description: 'Python programming',
          category: 'programming',
          tags: ['python']
        })
      )
      await writeFile(join(skillDir, 'content.md'), 'Initial content')
      await service.commit('Add Python skill')

      await writeFile(join(skillDir, 'content.md'), 'Updated Python content\nMore lines here')

      const status = await service.getStatus()
      expect(status.hasChanges).toBe(true)

      const fileDiff = await service.getFileDiff('skills/python-skill/content.md')
      expect(fileDiff).toContain('+Updated Python content')
    })
  })
})
