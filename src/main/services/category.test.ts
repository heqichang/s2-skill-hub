import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { CategoryService } from './category'
import type { Category } from '@shared/types/skill'

describe('CategoryService', () => {
  let tempDir: string
  let service: CategoryService

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skill-hub-cat-test-'))
    service = new CategoryService(tempDir)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  describe('listCategories', () => {
    it('should return empty array when no categories exist', async () => {
      const categories = await service.listCategories()
      expect(categories).toEqual([])
    })
  })

  describe('createCategory', () => {
    it('should create a new category', async () => {
      const data = { name: 'Programming', color: '#ff0000' }
      const category = await service.createCategory(data)

      expect(category.id).toBeDefined()
      expect(category.name).toBe('Programming')
      expect(category.color).toBe('#ff0000')
    })

    it('should create category without color', async () => {
      const data = { name: 'General' }
      const category = await service.createCategory(data)

      expect(category.id).toBeDefined()
      expect(category.name).toBe('General')
      expect(category.color).toBeUndefined()
    })
  })

  describe('listCategories', () => {
    it('should return all categories', async () => {
      await service.createCategory({ name: 'Category 1' })
      await service.createCategory({ name: 'Category 2' })

      const categories = await service.listCategories()
      expect(categories).toHaveLength(2)
      expect(categories.map((c: Category) => c.name)).toContain('Category 1')
      expect(categories.map((c: Category) => c.name)).toContain('Category 2')
    })
  })

  describe('updateCategory', () => {
    it('should update category name', async () => {
      const category = await service.createCategory({ name: 'Old Name' })
      const updated = await service.updateCategory(category.id, {
        name: 'New Name'
      })

      expect(updated.id).toBe(category.id)
      expect(updated.name).toBe('New Name')
    })

    it('should update category color', async () => {
      const category = await service.createCategory({
        name: 'Test',
        color: '#000000'
      })
      const updated = await service.updateCategory(category.id, {
        color: '#ffffff'
      })

      expect(updated.color).toBe('#ffffff')
    })

    it('should throw error for non-existent category', async () => {
      await expect(service.updateCategory('non-existent', { name: 'Test' })).rejects.toThrow(
        'Category with id non-existent not found'
      )
    })
  })

  describe('deleteCategory', () => {
    it('should delete a category', async () => {
      const category = await service.createCategory({ name: 'To Delete' })
      await service.deleteCategory(category.id)

      const categories = await service.listCategories()
      expect(categories).toHaveLength(0)
    })

    it('should do nothing for non-existent category', async () => {
      await service.createCategory({ name: 'Keep' })
      await service.deleteCategory('non-existent')

      const categories = await service.listCategories()
      expect(categories).toHaveLength(1)
      expect(categories[0].name).toBe('Keep')
    })
  })

  describe('persistence', () => {
    it('should persist categories across service instances', async () => {
      const service1 = new CategoryService(tempDir)
      await service1.createCategory({ name: 'Persisted', color: '#123456' })

      const service2 = new CategoryService(tempDir)
      const categories = await service2.listCategories()

      expect(categories).toHaveLength(1)
      expect(categories[0].name).toBe('Persisted')
      expect(categories[0].color).toBe('#123456')
    })
  })
})
