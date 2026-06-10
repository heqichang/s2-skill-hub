export interface GitCommit {
  hash: string
  shortHash: string
  message: string
  author: string
  email: string
  date: number
}

export type GitDiffStatus = 'added' | 'modified' | 'deleted'

export interface GitDiff {
  file: string
  status: GitDiffStatus
  additions?: number
  deletions?: number
}

export interface GitStatus {
  isRepo: boolean
  hasChanges: boolean
  changedFiles: GitDiff[]
}
