import { create } from 'zustand'
import type { GitCommit, GitStatus, GitDiff } from '@shared/types/git'
import { mockGitStatus, mockGitHistory } from '@renderer/utils/mockData'
import { isIpcSuccess } from '@renderer/utils/ipc'

interface GitStateStore {
  status: GitStatus | null
  history: GitCommit[]
  currentDiff: GitDiff[] | null
  isLoading: boolean
  error: string | null
  fetchStatus: () => Promise<void>
  fetchHistory: (limit?: number) => Promise<void>
  commit: (message: string) => Promise<GitCommit>
  rollback: (hash: string) => Promise<void>
  getDiff: (hash?: string) => Promise<GitDiff[]>
  getFileDiff: (filePath: string, hash?: string) => Promise<string>
  initGit: () => Promise<void>
  isRepo: () => Promise<boolean>
}

export const useGitStore = create<GitStateStore>((set) => ({
  status: null,
  history: [],
  currentDiff: null,
  isLoading: false,
  error: null,

  fetchStatus: async () => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.git.getStatus()
        if (isIpcSuccess(response)) {
          set({ status: response.data.status, isLoading: false })
          return
        }
        throw new Error(response.error.message)
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
      set({ status: mockGitStatus, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取 Git 状态失败',
        isLoading: false,
        status: mockGitStatus
      })
    }
  },

  fetchHistory: async (limit?: number) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.git.getHistory(limit ? { limit } : undefined)
        if (isIpcSuccess(response)) {
          set({ history: response.data.commits, isLoading: false })
          return
        }
        throw new Error(response.error.message)
      }
      await new Promise((resolve) => setTimeout(resolve, 250))
      set({ history: mockGitHistory, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取提交历史失败',
        isLoading: false,
        history: mockGitHistory
      })
    }
  },

  commit: async (message: string) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.git.commit({ message })
        if (isIpcSuccess(response)) {
          const newCommit = response.data.commit
          set((state) => ({
            history: [newCommit, ...state.history],
            status: { ...state.status!, hasChanges: false, changedFiles: [] },
            isLoading: false
          }))
          return newCommit
        }
        throw new Error(response.error.message)
      }
      await new Promise((resolve) => setTimeout(resolve, 400))
      const newCommit: GitCommit = {
        hash: `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
        shortHash: Date.now().toString(16).slice(0, 7),
        message,
        author: '当前用户',
        email: 'user@example.com',
        date: Date.now()
      }
      set((state) => ({
        history: [newCommit, ...state.history],
        status: { ...state.status!, hasChanges: false, changedFiles: [] },
        isLoading: false
      }))
      return newCommit
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '提交失败', isLoading: false })
      throw error
    }
  },

  rollback: async (hash: string) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.git.rollback({ hash })
        if (!isIpcSuccess(response)) {
          throw new Error(response.error.message)
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 400))
      }
      set({ isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '回滚失败', isLoading: false })
      throw error
    }
  },

  getDiff: async (hash?: string) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.git.getDiff(hash ? { hash } : undefined)
        if (isIpcSuccess(response)) {
          const diffs = response.data.diff
          set({ currentDiff: diffs, isLoading: false })
          return diffs
        }
        throw new Error(response.error.message)
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
      const diffs = mockGitStatus.changedFiles
      set({ currentDiff: diffs, isLoading: false })
      return diffs
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '获取差异失败', isLoading: false })
      throw error
    }
  },

  getFileDiff: async (filePath: string, hash?: string) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.git.getFileDiff({ filePath, hash })
        if (isIpcSuccess(response)) {
          set({ isLoading: false })
          return response.data.diff
        }
        throw new Error(response.error.message)
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
      set({ isLoading: false })
      return '--- mock diff ---'
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '获取文件差异失败', isLoading: false })
      throw error
    }
  },

  initGit: async () => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.git.init()
        if (!isIpcSuccess(response)) {
          throw new Error(response.error.message)
        }
      }
      set({ isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '初始化 Git 失败', isLoading: false })
      throw error
    }
  },

  isRepo: async () => {
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.git.isRepo()
        if (isIpcSuccess(response)) {
          return response.data.isRepo
        }
      }
      return false
    } catch {
      return false
    }
  }
}))
