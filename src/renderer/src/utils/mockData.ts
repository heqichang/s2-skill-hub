import type { Skill, Category } from '@shared/types/skill'
import type { ToolInfo, SyncState } from '@shared/types/adapter'
import type { GitCommit, GitStatus } from '@shared/types/git'
import { SyncStatus } from '@shared/types/skill'
import { ToolType } from '@shared/types/adapter'

export const mockCategories: Category[] = [
  { id: 'cat-1', name: '编程', color: '#1890ff' },
  { id: 'cat-2', name: '写作', color: '#52c41a' },
  { id: 'cat-3', name: '数据分析', color: '#faad14' },
  { id: 'cat-4', name: '设计', color: '#f5222d' },
  { id: 'cat-5', name: '其他', color: '#722ed1' }
]

const now = Date.now()

export const mockSkills: Skill[] = [
  {
    id: 'skill-1',
    name: 'React 组件开发',
    description: '快速开发高质量的 React 组件，包含最佳实践和设计模式。',
    content: '# React 组件开发\n\n这是一个关于 React 组件开发的 skill...',
    category: '编程',
    tags: ['React', 'TypeScript', '前端'],
    createdAt: now - 86400000 * 30,
    updatedAt: now - 86400000 * 2
  },
  {
    id: 'skill-2',
    name: '技术文档写作',
    description: '编写清晰、准确的技术文档，提升团队协作效率。',
    content: '# 技术文档写作\n\n如何编写好的技术文档...',
    category: '写作',
    tags: ['文档', '技术写作', '沟通'],
    createdAt: now - 86400000 * 20,
    updatedAt: now - 86400000 * 5
  },
  {
    id: 'skill-3',
    name: 'Python 数据分析',
    description: '使用 Python 进行数据分析和可视化，包括 Pandas、NumPy 等库。',
    content: '# Python 数据分析\n\n数据分析基础教程...',
    category: '数据分析',
    tags: ['Python', 'Pandas', '数据可视化'],
    createdAt: now - 86400000 * 15,
    updatedAt: now - 86400000 * 1
  },
  {
    id: 'skill-4',
    name: 'UI 设计规范',
    description: '制定和遵循 UI 设计规范，确保产品设计一致性。',
    content: '# UI 设计规范\n\n设计规范指南...',
    category: '设计',
    tags: ['UI', '设计系统', 'Figma'],
    createdAt: now - 86400000 * 10,
    updatedAt: now - 86400000 * 7
  },
  {
    id: 'skill-5',
    name: '代码审查指南',
    description: '高效进行代码审查的最佳实践和检查清单。',
    content: '# 代码审查指南\n\n如何做好代码审查...',
    category: '编程',
    tags: ['代码审查', '最佳实践', '质量'],
    createdAt: now - 86400000 * 25,
    updatedAt: now - 86400000 * 3
  },
  {
    id: 'skill-6',
    name: 'API 设计',
    description: '设计优雅、易用的 RESTful API 接口。',
    content: '# API 设计\n\nRESTful API 设计最佳实践...',
    category: '编程',
    tags: ['API', 'REST', '后端'],
    createdAt: now - 86400000 * 12,
    updatedAt: now - 86400000 * 1
  }
]

export const mockToolInfos: ToolInfo[] = [
  {
    type: ToolType.CLAUDE,
    name: 'Claude',
    description: 'Anthropic 的 AI 助手',
    isInstalled: true,
    skillDirPath: '/path/to/claude/skills'
  },
  {
    type: ToolType.CURSOR,
    name: 'Cursor',
    description: 'AI 驱动的代码编辑器',
    isInstalled: true,
    skillDirPath: '/path/to/cursor/skills'
  },
  {
    type: ToolType.TRAE,
    name: 'Trae',
    description: 'Trae AI 助手',
    isInstalled: false,
    skillDirPath: null
  }
]

export function createMockSyncStates(skillId: string): SyncState[] {
  const states: SyncState[] = [
    {
      toolType: ToolType.CLAUDE,
      status: skillId === 'skill-1' ? SyncStatus.SYNCED : SyncStatus.UNSYNCED,
      lastSyncAt: skillId === 'skill-1' ? now - 3600000 : undefined
    },
    {
      toolType: ToolType.CURSOR,
      status:
        skillId === 'skill-2' || skillId === 'skill-3' ? SyncStatus.SYNCED : SyncStatus.MODIFIED,
      lastSyncAt: now - 7200000
    }
  ]
  return states
}

export const mockGitStatus: GitStatus = {
  isRepo: true,
  hasChanges: true,
  changedFiles: [
    { file: 'skills/react-component.md', status: 'modified', additions: 15, deletions: 3 },
    { file: 'skills/new-skill.md', status: 'added', additions: 42, deletions: 0 }
  ]
}

export const mockGitHistory: GitCommit[] = [
  {
    hash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
    shortHash: 'a1b2c3d',
    message: '添加数据分析 skill',
    author: '张三',
    email: 'zhangsan@example.com',
    date: now - 86400000 * 2
  },
  {
    hash: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1',
    shortHash: 'b2c3d4e',
    message: '更新 React 组件文档',
    author: '李四',
    email: 'lisi@example.com',
    date: now - 86400000 * 5
  },
  {
    hash: 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
    shortHash: 'c3d4e5f',
    message: '初始提交',
    author: '王五',
    email: 'wangwu@example.com',
    date: now - 86400000 * 30
  }
]
