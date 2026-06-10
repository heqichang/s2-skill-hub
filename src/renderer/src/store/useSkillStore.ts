import { create } from 'zustand'
import type { Skill, Category } from '@shared/types/skill'
import type { ViewMode } from '@renderer/utils/constants'
import { VIEW_MODES } from '@renderer/utils/constants'
import { mockSkills, mockCategories } from '@renderer/utils/mockData'
import { isIpcSuccess } from '@renderer/utils/ipc'

interface SkillState {
  skills: Skill[]
  categories: Category[]
  selectedSkillId: string | null
  selectedSkillIds: string[]
  searchQuery: string
  selectedCategory: string | null
  selectedTags: string[]
  viewMode: ViewMode
  isLoading: boolean
  error: string | null
  isRepoInitialized: boolean
  fetchSkills: () => Promise<void>
  fetchCategories: () => Promise<void>
  checkRepoInitialized: () => Promise<void>
  selectSkill: (id: string | null) => void
  toggleSkillSelection: (id: string) => void
  clearSelection: () => void
  selectAll: (ids: string[]) => void
  setSearchQuery: (query: string) => void
  setCategory: (category: string | null) => void
  toggleTag: (tag: string) => void
  setViewMode: (mode: ViewMode) => void
  createSkill: (skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Skill>
  updateSkill: (id: string, data: Partial<Omit<Skill, 'id' | 'createdAt'>>) => Promise<Skill>
  deleteSkill: (id: string) => Promise<void>
  deleteSkills: (ids: string[]) => Promise<void>
  getFilteredSkills: () => Skill[]
  getAllTags: () => string[]
  getTagCount: (tag: string) => number
  getCategoryCount: (categoryName: string) => number
  createCategory: (category: Omit<Category, 'id'>) => Promise<Category>
  updateCategory: (id: string, data: Partial<Omit<Category, 'id'>>) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
}

export const useSkillStore = create<SkillState>((set, get) => ({
  skills: [],
  categories: [],
  selectedSkillId: null,
  selectedSkillIds: [],
  searchQuery: '',
  selectedCategory: null,
  selectedTags: [],
  viewMode: VIEW_MODES.LIST,
  isLoading: false,
  error: null,
  isRepoInitialized: false,

  checkRepoInitialized: async () => {
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.repo.isInitialized()
        if (isIpcSuccess(response)) {
          set({ isRepoInitialized: response.data.isInitialized })
          return
        }
      }
    } catch {
      // IPC call failed, fall through to mock data
    }
    set({ isRepoInitialized: false })
  },

  fetchSkills: async () => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.repo.listSkills()
        if (isIpcSuccess(response)) {
          set({ skills: response.data.skills, isLoading: false })
          return
        }
        throw new Error(response.error.message)
      }
      await new Promise((resolve) => setTimeout(resolve, 300))
      set({ skills: mockSkills, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取技能列表失败',
        isLoading: false,
        skills: mockSkills
      })
    }
  },

  fetchCategories: async () => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.repo.listCategories()
        if (isIpcSuccess(response)) {
          set({ categories: response.data.categories, isLoading: false })
          return
        }
        throw new Error(response.error.message)
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
      set({ categories: mockCategories, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '获取分类失败',
        isLoading: false,
        categories: mockCategories
      })
    }
  },

  selectSkill: (id) => set({ selectedSkillId: id }),

  toggleSkillSelection: (id) =>
    set((state) => {
      const selected = state.selectedSkillIds.includes(id)
        ? state.selectedSkillIds.filter((i) => i !== id)
        : [...state.selectedSkillIds, id]
      return { selectedSkillIds: selected }
    }),

  clearSelection: () => set({ selectedSkillIds: [], selectedSkillId: null }),

  selectAll: (ids) => set({ selectedSkillIds: ids }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setCategory: (category) => set({ selectedCategory: category, selectedSkillId: null }),

  toggleTag: (tag) =>
    set((state) => {
      const tags = state.selectedTags.includes(tag)
        ? state.selectedTags.filter((t) => t !== tag)
        : [...state.selectedTags, tag]
      return { selectedTags: tags }
    }),

  setViewMode: (mode) => set({ viewMode: mode }),

  createSkill: async (skillData) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.repo.createSkill({ data: skillData })
        if (isIpcSuccess(response)) {
          const newSkill = response.data.skill
          set((state) => ({
            skills: [...state.skills, newSkill],
            isLoading: false
          }))
          return newSkill
        }
        throw new Error(response.error.message)
      }
      await new Promise((resolve) => setTimeout(resolve, 300))
      const newSkill: Skill = {
        ...skillData,
        id: `skill-${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      set((state) => ({
        skills: [...state.skills, newSkill],
        isLoading: false
      }))
      return newSkill
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '创建技能失败', isLoading: false })
      throw error
    }
  },

  updateSkill: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.repo.updateSkill({ id, data })
        if (isIpcSuccess(response)) {
          const updatedSkill = response.data.skill
          set((state) => ({
            skills: state.skills.map((skill) => (skill.id === id ? updatedSkill : skill)),
            isLoading: false
          }))
          return updatedSkill
        }
        throw new Error(response.error.message)
      }
      await new Promise((resolve) => setTimeout(resolve, 300))
      set((state) => ({
        skills: state.skills.map((skill) =>
          skill.id === id ? { ...skill, ...data, updatedAt: Date.now() } : skill
        ),
        isLoading: false
      }))
      const updatedSkill = get().skills.find((s) => s.id === id)
      if (!updatedSkill) throw new Error('技能不存在')
      return updatedSkill
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '更新技能失败', isLoading: false })
      throw error
    }
  },

  deleteSkill: async (id) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.repo.deleteSkill({ id })
        if (!isIpcSuccess(response)) {
          throw new Error(response.error.message)
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
      set((state) => ({
        skills: state.skills.filter((skill) => skill.id !== id),
        selectedSkillId: state.selectedSkillId === id ? null : state.selectedSkillId,
        selectedSkillIds: state.selectedSkillIds.filter((i) => i !== id),
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '删除技能失败', isLoading: false })
      throw error
    }
  },

  deleteSkills: async (ids) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        await Promise.all(ids.map((id) => window.ipcApi.repo.deleteSkill({ id })))
      } else {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
      set((state) => ({
        skills: state.skills.filter((skill) => !ids.includes(skill.id)),
        selectedSkillId: ids.includes(state.selectedSkillId || '') ? null : state.selectedSkillId,
        selectedSkillIds: [],
        isLoading: false
      }))
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '批量删除失败', isLoading: false })
      throw error
    }
  },

  getFilteredSkills: () => {
    const state = get()
    let filtered = [...state.skills]

    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase()
      filtered = filtered.filter(
        (skill) =>
          skill.name.toLowerCase().includes(query) ||
          skill.description.toLowerCase().includes(query) ||
          (skill.tags || []).some((tag) => tag.toLowerCase().includes(query))
      )
    }

    if (state.selectedCategory) {
      filtered = filtered.filter((skill) => skill.category === state.selectedCategory)
    }

    if (state.selectedTags.length > 0) {
      filtered = filtered.filter((skill) =>
        state.selectedTags.every((tag) => (skill.tags || []).includes(tag))
      )
    }

    return filtered
  },

  getAllTags: () => {
    const state = get()
    const tagSet = new Set<string>()
    state.skills.forEach((skill) => {
      const tags = skill.tags || []
      tags.forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort((a, b) => get().getTagCount(b) - get().getTagCount(a))
  },

  getTagCount: (tag: string) => {
    const state = get()
    return state.skills.filter((skill) => (skill.tags || []).includes(tag)).length
  },

  getCategoryCount: (categoryName: string) => {
    const state = get()
    return state.skills.filter((skill) => skill.category === categoryName).length
  },

  createCategory: async (categoryData) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.repo.createCategory({ data: categoryData })
        if (isIpcSuccess(response)) {
          const newCategory = response.data.category
          set((state) => ({
            categories: [...state.categories, newCategory],
            isLoading: false
          }))
          return newCategory
        }
        throw new Error(response.error.message)
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
      const newCategory: Category = {
        ...categoryData,
        id: `cat-${Date.now()}`
      }
      set((state) => ({
        categories: [...state.categories, newCategory],
        isLoading: false
      }))
      return newCategory
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '创建分类失败', isLoading: false })
      throw error
    }
  },

  updateCategory: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.repo.updateCategory({ id, data })
        if (isIpcSuccess(response)) {
          const updatedCategory = response.data.category
          set((state) => ({
            categories: state.categories.map((cat) => (cat.id === id ? updatedCategory : cat)),
            isLoading: false
          }))
          return updatedCategory
        }
        throw new Error(response.error.message)
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
      set((state) => ({
        categories: state.categories.map((cat) => (cat.id === id ? { ...cat, ...data } : cat)),
        isLoading: false
      }))
      const updatedCategory = get().categories.find((c) => c.id === id)
      if (!updatedCategory) throw new Error('分类不存在')
      return updatedCategory
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '更新分类失败', isLoading: false })
      throw error
    }
  },

  deleteCategory: async (id) => {
    set({ isLoading: true, error: null })
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.repo.deleteCategory({ id })
        if (!isIpcSuccess(response)) {
          throw new Error(response.error.message)
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      set((state) => {
        const category = state.categories.find((c) => c.id === id)
        return {
          categories: state.categories.filter((cat) => cat.id !== id),
          selectedCategory:
            state.selectedCategory === category?.name ? null : state.selectedCategory,
          isLoading: false
        }
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '删除分类失败', isLoading: false })
      throw error
    }
  }
}))
