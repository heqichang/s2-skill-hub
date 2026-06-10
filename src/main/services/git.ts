import { simpleGit, SimpleGit, StatusResult, LogResult, DefaultLogFields } from 'simple-git'
import { access, constants } from 'node:fs/promises'
import type { GitCommit, GitDiff, GitStatus, GitDiffStatus } from '@shared/types/git'

const DEFAULT_AUTHOR = {
  name: 'Skill Hub',
  email: 'skill-hub@example.com'
}

export class GitService {
  private git: SimpleGit | null = null
  private repoPath: string

  constructor(repoPath: string) {
    this.repoPath = repoPath
  }

  private async getGit(): Promise<SimpleGit> {
    if (!this.git) {
      try {
        await access(this.repoPath, constants.F_OK)
      } catch {
        throw new Error(`Repository path does not exist: ${this.repoPath}`)
      }
      this.git = simpleGit(this.repoPath)
    }
    return this.git
  }

  async init(): Promise<void> {
    try {
      const git = await this.getGit()
      await git.init()
    } catch (error) {
      throw new Error(`Failed to initialize git repository: ${(error as Error).message}`)
    }
  }

  async isRepo(): Promise<boolean> {
    try {
      const git = await this.getGit()
      return await git.checkIsRepo()
    } catch {
      return false
    }
  }

  async getStatus(): Promise<GitStatus> {
    try {
      const isRepo = await this.isRepo()
      if (!isRepo) {
        return {
          isRepo: false,
          hasChanges: false,
          changedFiles: []
        }
      }

      const git = await this.getGit()
      const status: StatusResult = await git.status()
      const changedFiles: GitDiff[] = []

      for (const file of status.files) {
        const statusChar = file.working_dir || file.index
        let fileStatus: GitDiffStatus = 'modified'

        if (statusChar === 'A' || statusChar === '?') {
          fileStatus = 'added'
        } else if (statusChar === 'D') {
          fileStatus = 'deleted'
        } else if (statusChar === 'M') {
          fileStatus = 'modified'
        }

        changedFiles.push({
          file: file.path,
          status: fileStatus
        })
      }

      return {
        isRepo: true,
        hasChanges: status.files.length > 0,
        changedFiles
      }
    } catch (error) {
      throw new Error(`Failed to get git status: ${(error as Error).message}`)
    }
  }

  async commit(message: string, author?: { name: string; email: string }): Promise<GitCommit> {
    try {
      const authorInfo = author || DEFAULT_AUTHOR
      const git = await this.getGit()

      await git.add('.')

      const commitResult = await git.commit(message, {
        '--author': `${authorInfo.name} <${authorInfo.email}>`
      })

      const commit = await this.getCommit(commitResult.commit)
      if (!commit) {
        throw new Error('Failed to retrieve commit after creation')
      }

      return commit
    } catch (error) {
      throw new Error(`Failed to commit: ${(error as Error).message}`)
    }
  }

  async getHistory(limit?: number): Promise<GitCommit[]> {
    try {
      const git = await this.getGit()
      const options: { n?: number } = {}
      if (limit) {
        options.n = limit
      }

      const log: LogResult<DefaultLogFields> = await git.log(options)
      return log.all.map((entry) => this.mapLogEntryToCommit(entry))
    } catch (error) {
      const msg = (error as Error).message
      if (
        msg.includes('does not have any commits yet') ||
        msg.includes('ambiguous argument') ||
        msg.includes('bad default revision')
      ) {
        return []
      }
      throw new Error(`Failed to get commit history: ${msg}`)
    }
  }

  async getCommit(hash: string): Promise<GitCommit | null> {
    try {
      const git = await this.getGit()
      const log: LogResult<DefaultLogFields> = await git.log([hash])

      if (log.all.length === 0) {
        return null
      }

      return this.mapLogEntryToCommit(log.all[0])
    } catch (error) {
      const msg = (error as Error).message
      if (
        msg.includes('unknown revision') ||
        msg.includes('bad revision') ||
        msg.includes('bad object') ||
        msg.includes('does not have any commits yet') ||
        msg.includes('exists on disk, but not in')
      ) {
        return null
      }
      throw new Error(`Failed to get commit: ${msg}`)
    }
  }

  async getDiff(hash?: string): Promise<GitDiff[]> {
    try {
      const git = await this.getGit()
      let diffOutput: string

      if (hash) {
        const history = await this.getHistory()
        if (history.length <= 1 || history[history.length - 1].hash === hash) {
          diffOutput = await git.show(['--stat', '--format=', hash])
        } else {
          diffOutput = await git.diff(['--stat', `${hash}^..${hash}`])
        }
      } else {
        diffOutput = await git.diff(['--stat'])
      }

      return this.parseDiffStat(diffOutput)
    } catch (error) {
      throw new Error(`Failed to get diff: ${(error as Error).message}`)
    }
  }

  async getFileDiff(filePath: string, hash?: string): Promise<string> {
    try {
      const git = await this.getGit()
      if (hash) {
        const history = await this.getHistory()
        if (history.length <= 1 || history[history.length - 1].hash === hash) {
          return await git.show([hash, '--', filePath])
        }
        return await git.diff([`${hash}^..${hash}`, '--', filePath])
      }
      return await git.diff(['--', filePath])
    } catch (error) {
      throw new Error(`Failed to get file diff: ${(error as Error).message}`)
    }
  }

  async rollback(hash: string): Promise<void> {
    try {
      const git = await this.getGit()
      await git.reset(['--hard', hash])
    } catch (error) {
      throw new Error(`Failed to rollback: ${(error as Error).message}`)
    }
  }

  private mapLogEntryToCommit(entry: DefaultLogFields): GitCommit {
    return {
      hash: entry.hash,
      shortHash: entry.hash.substring(0, 7),
      message: entry.message,
      author: entry.author_name,
      email: entry.author_email,
      date: new Date(entry.date).getTime()
    }
  }

  private parseDiffStat(diffStat: string): GitDiff[] {
    const lines = diffStat.trim().split('\n')
    const result: GitDiff[] = []

    for (const line of lines) {
      if (!line.trim() || line.includes('files changed') || line.includes('file changed')) {
        continue
      }

      const match = line.match(/^\s*(.+?)\s+\|\s+(\d+)\s+([+-]+)\s*$/)
      if (match) {
        const file = match[1].trim()
        const total = parseInt(match[2], 10)
        const changes = match[3]

        const additions = (changes.match(/\+/g) || []).length
        const deletions = (changes.match(/-/g) || []).length

        let status: GitDiffStatus = 'modified'
        if (deletions === 0 && total > 0) {
          status = 'added'
        } else if (additions === 0 && total > 0) {
          status = 'deleted'
        }

        result.push({
          file,
          status,
          additions,
          deletions
        })
      }
    }

    return result
  }
}
