import { readFile, writeFile, access, constants } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { Category } from '@shared/types/skill'

const CATEGORIES_FILE = 'categories.json'

export class CategoryService {
  private categoriesPath: string

  constructor(repoPath: string) {
    this.categoriesPath = join(repoPath, CATEGORIES_FILE)
  }

  async listCategories(): Promise<Category[]> {
    try {
      await access(this.categoriesPath, constants.F_OK)
      const raw = await readFile(this.categoriesPath, 'utf-8')
      return JSON.parse(raw) as Category[]
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return []
      }
      throw error
    }
  }

  async createCategory(data: Omit<Category, 'id'>): Promise<Category> {
    const categories = await this.listCategories()
    const category: Category = {
      ...data,
      id: randomUUID()
    }
    categories.push(category)
    await this.saveCategories(categories)
    return category
  }

  async updateCategory(id: string, data: Partial<Omit<Category, 'id'>>): Promise<Category> {
    const categories = await this.listCategories()
    const index = categories.findIndex((c) => c.id === id)
    if (index === -1) {
      throw new Error(`Category with id ${id} not found`)
    }
    categories[index] = { ...categories[index], ...data, id }
    await this.saveCategories(categories)
    return categories[index]
  }

  async deleteCategory(id: string): Promise<void> {
    const categories = await this.listCategories()
    const filtered = categories.filter((c) => c.id !== id)
    await this.saveCategories(filtered)
  }

  private async saveCategories(categories: Category[]): Promise<void> {
    await writeFile(this.categoriesPath, JSON.stringify(categories, null, 2), 'utf-8')
  }
}
