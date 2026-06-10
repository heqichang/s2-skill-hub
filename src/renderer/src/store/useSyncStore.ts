import { create } from 'zustand'
import type { ToolInfo, SyncState } from '@shared/types/adapter'
import { SyncStatus } from '@shared/types/skill'
import { ToolType } from '@shared/types/adapter'
import { mockToolInfos, createMockSyncStates } from '@renderer/utils/mockData'
import { isIpcSuccess } from '@renderer/utils/ipc'

interface SyncStateStore {
  toolInfos: ToolInfo[]
  syncStates: Map<string, SyncState[]>
  isLoading: boolean
  error: string | null
  fetchToolInfos: () => Promise<void>
  fetchSyncStates: (skillId: string) => Promise<void>
  fetchAllSyncStates: () => Promise<void>
  syncSkillToTool: (skillId: string, toolType: ToolType) => Promise<void>
  syncSkillToAllTools: (skillId: string) => Promise<void>
  syncSkillsToTool: (skillIds: string[], toolType: ToolType) => Promise<void>
  syncAllSkillsToTool: (toolType: ToolType) => Promise<void>
  syncAllSkillsToAllTools: () => Promise<void>
  getSkillSyncStates: (skillId: string) => SyncState[]
  refreshSkillSyncState: (skillId: string) => Promise<void>
}

export const useSyncStore = create<SyncStateStore>((set, get) => ({
  toolInfos: [],
  syncStates: new Map(),
  isLoading: false,
  error: null,

  fetchToolInfos: async () => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.sync.getToolInfos()
        if (isIpcSuccess(response)) {
          set({ toolInfos: response.data.tools, isLoading: false })
          return
        }
        throw new Error(response.error.message)
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
      set({ toolInfos: mockToolInfos, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取工具信息失败',
        isLoading: false,
        toolInfos: mockToolInfos
      })
    }
  },

  fetchSyncStates: async (skillId: string) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.sync.getSkillSyncStates({ skillId })
        if (isIpcSuccess(response)) {
          set((state) => {
            const newMap = new Map(state.syncStates)
            newMap.set(skillId, response.data.states)
            return { syncStates: newMap, isLoading: false }
          })
          return
        }
        throw new Error(response.error.message)
      }
      await new Promise((resolve) => setTimeout(resolve, 150))
      const states = createMockSyncStates(skillId)
      set((state) => {
        const newMap = new Map(state.syncStates)
        newMap.set(skillId, states)
        return { syncStates: newMap, isLoading: false }
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '获取同步状态失败', isLoading: false })
    }
  },

  fetchAllSyncStates: async () => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.sync.getAllSkillsSyncStates()
        if (isIpcSuccess(response)) {
          const newMap = new Map<string, SyncState[]>()
          response.data.states.forEach((item) => {
            newMap.set(item.skillId, item.states)
          })
          set({ syncStates: newMap, isLoading: false })
          return
        }
        throw new Error(response.error.message)
      }
      await new Promise((resolve) => setTimeout(resolve, 300))
      const newMap = new Map<string, SyncState[]>()
      const skillIds = ['skill-1', 'skill-2', 'skill-3', 'skill-4', 'skill-5', 'skill-6']
      skillIds.forEach((id) => {
        newMap.set(id, createMockSyncStates(id))
      })
      set({ syncStates: newMap, isLoading: false })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '获取同步状态失败', isLoading: false })
    }
  },

  syncSkillToTool: async (skillId: string, toolType: ToolType) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.sync.syncSkillToTool({ skillId, toolType })
        if (!isIpcSuccess(response)) {
          throw new Error(response.error.message)
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      set((state) => {
        const newMap = new Map(state.syncStates)
        const existing = newMap.get(skillId) || []
        const updated = existing.map((s) =>
          s.toolType === toolType ? { ...s, status: SyncStatus.SYNCED, lastSyncAt: Date.now() } : s
        )
        if (!updated.find((s) => s.toolType === toolType)) {
          updated.push({
            toolType,
            status: SyncStatus.SYNCED,
            lastSyncAt: Date.now()
          })
        }
        newMap.set(skillId, updated)
        return { syncStates: newMap, isLoading: false }
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '同步失败', isLoading: false })
      throw error
    }
  },

  syncSkillToAllTools: async (skillId: string) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.sync.syncSkillToAllTools({ skillId })
        if (!isIpcSuccess(response)) {
          throw new Error(response.error.message)
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800))
      }
      set((state) => {
        const newMap = new Map(state.syncStates)
        const toolInfos = get().toolInfos
        const updated = toolInfos
          .filter((t) => t.isInstalled)
          .map((t) => ({
            toolType: t.type,
            status: SyncStatus.SYNCED,
            lastSyncAt: Date.now()
          }))
        newMap.set(skillId, updated)
        return { syncStates: newMap, isLoading: false }
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '同步失败', isLoading: false })
      throw error
    }
  },

  syncSkillsToTool: async (skillIds: string[], toolType: ToolType) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        await Promise.all(
          skillIds.map((id) => window.ipcApi.sync.syncSkillToTool({ skillId: id, toolType }))
        )
      } else {
        await new Promise((resolve) => setTimeout(resolve, 600))
      }
      set((state) => {
        const newMap = new Map(state.syncStates)
        skillIds.forEach((skillId) => {
          const existing = newMap.get(skillId) || []
          const updated = existing.map((s) =>
            s.toolType === toolType
              ? { ...s, status: SyncStatus.SYNCED, lastSyncAt: Date.now() }
              : s
          )
          if (!updated.find((s) => s.toolType === toolType)) {
            updated.push({
              toolType,
              status: SyncStatus.SYNCED,
              lastSyncAt: Date.now()
            })
          }
          newMap.set(skillId, updated)
        })
        return { syncStates: newMap, isLoading: false }
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '批量同步失败', isLoading: false })
      throw error
    }
  },

  syncAllSkillsToTool: async (toolType: ToolType) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.sync.syncAllSkillsToTool({ toolType })
        if (!isIpcSuccess(response)) {
          throw new Error(response.error.message)
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      set((state) => {
        const newMap = new Map(state.syncStates)
        newMap.forEach((states, skillId) => {
          const updated = states.map((s) =>
            s.toolType === toolType
              ? { ...s, status: SyncStatus.SYNCED, lastSyncAt: Date.now() }
              : s
          )
          newMap.set(skillId, updated)
        })
        return { syncStates: newMap, isLoading: false }
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '同步失败', isLoading: false })
      throw error
    }
  },

  syncAllSkillsToAllTools: async () => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.sync.syncAllSkillsToAllTools()
        if (!isIpcSuccess(response)) {
          throw new Error(response.error.message)
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }
      set((state) => {
        const newMap = new Map(state.syncStates)
        newMap.forEach((states, skillId) => {
          newMap.set(
            skillId,
            states.map((s) => ({ ...s, status: SyncStatus.SYNCED, lastSyncAt: Date.now() }))
          )
        })
        return { syncStates: newMap, isLoading: false }
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '同步失败', isLoading: false })
      throw error
    }
  },

  getSkillSyncStates: (skillId: string) => {
    return get().syncStates.get(skillId) || []
  },

  refreshSkillSyncState: async (skillId: string) => {
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.sync.getSkillSyncStates({ skillId })
        if (isIpcSuccess(response)) {
          set((state) => {
            const newMap = new Map(state.syncStates)
            newMap.set(skillId, response.data.states)
            return { syncStates: newMap }
          })
        }
      }
    } catch {
      // ignore error
    }
  }
}))
