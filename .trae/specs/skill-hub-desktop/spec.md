# Skill Hub - 本地桌面端 AI Skill 管理工具 - Product Requirement Document

## Overview
- **Summary**: Skill Hub 是一款面向个人用户的本地桌面端 AI Skill 管理工具，用于统一管理 Claude / Cursor / Trae 等 AI 工具的 Skill（自定义指令/系统提示词），并支持按需同步到各工具的全局 Skill 目录。
- **Purpose**: 解决用户在多个 AI 工具中分散维护 Skill 的痛点，通过统一仓库 + 按需同步 + Git 版本管理，实现 Skill 的集中化、版本化、跨工具化管理。
- **Target Users**: 频繁使用多个 AI 编程助手（Claude Desktop、Cursor、Trae 等）的开发者和个人用户，希望统一管理和复用自定义 Skill。

## Goals
- 提供单一可信源的本地 Skill 仓库，统一管理所有 AI 工具的 Skill
- 支持一键将选定 Skill 同步到 Claude / Cursor / Trae 等工具的全局目录
- 内置 Git 版本管理，支持提交、历史查看、Diff、回滚操作
- 维护标准 Skill 格式，自动适配不同工具的目录结构和格式要求
- 提供美观易用的桌面端可视化界面，支持搜索、分类、标签、编辑
- 坚持本地优先原则，不依赖云端、不强制登录、不上传用户数据

## Non-Goals (Out of Scope)
- 不提供云端 Skill 共享或市场功能
- 不提供用户账号系统和登录功能
- 不支持 Skill 的在线协作编辑
- 不提供 AI 辅助生成 Skill 的功能（仅管理，不生成）
- 不支持移动端或 Web 端
- 不提供插件/扩展市场

## Background & Context
- 当前主流 AI 编程工具（Claude Desktop、Cursor、Trae）都支持自定义 Skill / 系统提示词功能
- 各工具的 Skill 存储位置、目录结构、文件格式各不相同
- 用户在多个工具间复用 Skill 时需要手动复制粘贴，维护成本高
- Skill 的版本管理缺失，无法追溯历史变更或回滚
- 缺少统一的分类、标签、搜索机制来组织大量 Skill

## Functional Requirements

### FR-1: Skill 仓库管理
- 在本地指定目录创建并维护一个统一的 Skill 仓库
- 支持创建、编辑、删除 Skill
- 每个 Skill 包含：名称、描述、内容、分类、标签、创建时间、更新时间
- 支持 Skill 的分类管理（创建、编辑、删除分类）
- 支持 Skill 的标签管理（添加、移除标签）
- 支持 Skill 搜索（按名称、描述、内容、标签搜索）

### FR-2: 多工具同步
- 支持同步到 Claude Desktop 全局 Skill 目录
- 支持同步到 Cursor 全局 Skill 目录
- 支持同步到 Trae 全局 Skill 目录
- 用户可选择单个或多个 Skill 同步到指定工具
- 显示每个 Skill 在各工具中的同步状态（已同步/未同步/有变更）
- 支持一键同步所有已关联的 Skill
- 自动处理不同工具的目录结构和格式适配

### FR-3: Git 版本管理
- Skill 仓库自动初始化为 Git 仓库
- 支持手动提交变更（填写提交信息）
- 支持查看提交历史列表
- 支持查看任意两个版本间的 Diff
- 支持回滚到指定历史版本
- 支持查看当前工作区变更（未提交的修改）

### FR-4: 标准 Skill 格式与适配
- 内部维护一套标准 Skill 格式（JSON/YAML + Markdown 内容）
- 提供适配层，将标准格式转换为各工具所需的格式
- Claude Desktop 适配：.md 文件 + 特定目录结构
- Cursor 适配：.cursorrules 或相应格式
- Trae 适配：Trae Skill 目录结构和格式

### FR-5: 桌面端 UI 界面
- 侧边栏导航：分类列表、标签云、工具列表
- 主内容区：Skill 列表/卡片视图、Skill 详情/编辑器
- 顶部搜索栏：全文搜索 Skill
- 同步状态指示器：直观显示各工具同步状态
- 版本管理面板：提交历史、Diff 查看、回滚操作
- 设置面板：仓库路径配置、工具路径配置、Git 配置

### FR-6: 工具路径自动检测
- 自动检测各 AI 工具的全局 Skill 目录位置
- 支持手动修改工具路径配置
- 检测工具安装状态并在 UI 中显示

### FR-7: 本地数据存储
- 所有 Skill 数据存储在本地文件系统
- 配置数据存储在本地应用数据目录
- 不依赖任何云端服务
- 支持导出/导入 Skill 仓库备份

## Non-Functional Requirements

### NFR-1: 性能
- 应用启动时间 < 2 秒
- Skill 列表加载（1000 条以内）< 500ms
- 搜索响应时间 < 200ms
- 同步操作（单条 Skill）< 1 秒

### NFR-2: 可靠性
- 同步操作失败时不破坏目标工具的现有数据
- Git 操作异常时有明确的错误提示
- 数据持久化保证：写入操作完成后再返回成功

### NFR-3: 安全性
- 所有数据存储在本地，不上传到任何服务器
- 不收集用户使用数据
- 不包含任何遥测或统计上报功能
- 同步操作前提示用户确认

### NFR-4: 可维护性
- 模块化设计，便于新增工具适配
- 清晰的代码分层：数据层、业务逻辑层、UI 层
- 适配层采用插件式架构

### NFR-5: 可用性
- 界面简洁直观，新手可在 5 分钟内上手
- 操作有明确的反馈和状态提示
- 错误信息友好易懂
- 支持键盘快捷键

### NFR-6: 跨平台
- 支持 Windows 操作系统
- 架构设计预留 macOS / Linux 扩展能力

## Constraints

### 技术约束
- 桌面端应用，基于 Electron + React 技术栈
- 使用 TypeScript 开发
- 使用 Git 命令行或 Node Git 库进行版本管理
- 本地文件系统存储，不使用数据库

### 业务约束
- 纯本地应用，无后端服务
- 不开源协议待定（当前假设为 MIT）
- 单用户使用，不支持多用户

### 依赖
- Git（系统需已安装）
- Electron 框架
- React + TypeScript
- 各 AI 工具（Claude Desktop / Cursor / Trae）为可选依赖

## Assumptions
- 用户系统已安装 Git
- 用户已安装至少一个目标 AI 工具（Claude Desktop / Cursor / Trae）
- 用户对 AI 工具的 Skill 概念有基本了解
- Windows 为主要目标平台
- 各工具的 Skill 目录结构和格式可通过文档或逆向获得

## Acceptance Criteria

### AC-1: Skill 仓库创建与初始化
- **Given**: 用户首次启动应用
- **When**: 用户选择或确认仓库路径并点击初始化
- **Then**: 
  - 在指定路径创建 Skill 仓库目录
  - 自动初始化为 Git 仓库
  - 创建示例 Skill 帮助用户上手
  - 应用主界面正常显示仓库内容
- **Verification**: `programmatic`

### AC-2: Skill 增删改查
- **Given**: 用户已初始化 Skill 仓库
- **When**: 用户执行创建/编辑/删除 Skill 操作
- **Then**: 
  - 操作成功后列表实时更新
  - 数据正确持久化到文件系统
  - 删除操作有二次确认
- **Verification**: `programmatic`

### AC-3: Skill 搜索与筛选
- **Given**: 仓库中存在多个 Skill
- **When**: 用户输入搜索关键词或选择分类/标签
- **Then**: 
  - 列表实时过滤显示匹配结果
  - 搜索支持名称、描述、内容、标签全文匹配
  - 搜索结果高亮显示关键词
- **Verification**: `programmatic`

### AC-4: 同步到 Claude Desktop
- **Given**: 系统已安装 Claude Desktop，存在一个 Skill
- **When**: 用户选择该 Skill 并同步到 Claude Desktop
- **Then**: 
  - Skill 文件出现在 Claude Desktop 的全局 Skill 目录
  - 格式符合 Claude Desktop 的要求
  - UI 中该 Skill 对应 Claude 的状态变为"已同步"
- **Verification**: `programmatic`

### AC-5: 同步到 Cursor
- **Given**: 系统已安装 Cursor，存在一个 Skill
- **When**: 用户选择该 Skill 并同步到 Cursor
- **Then**: 
  - Skill 文件出现在 Cursor 的全局 Skill 目录
  - 格式符合 Cursor 的要求
  - UI 中该 Skill 对应 Cursor 的状态变为"已同步"
- **Verification**: `programmatic`

### AC-6: 同步到 Trae
- **Given**: 系统已安装 Trae，存在一个 Skill
- **When**: 用户选择该 Skill 并同步到 Trae
- **Then**: 
  - Skill 文件出现在 Trae 的全局 Skill 目录
  - 格式符合 Trae 的要求
  - UI 中该 Skill 对应 Trae 的状态变为"已同步"
- **Verification**: `programmatic`

### AC-7: 同步状态检测
- **Given**: Skill 已同步到某工具，之后修改了 Skill 内容
- **When**: 用户查看 Skill 列表
- **Then**: 该 Skill 对应工具的状态显示为"有变更"
- **Verification**: `programmatic`

### AC-8: Git 提交
- **Given**: Skill 仓库有未提交的变更
- **When**: 用户输入提交信息并执行提交
- **Then**: 
  - Git 提交成功创建
  - 提交历史中显示新提交
  - 工作区变更清空
- **Verification**: `programmatic`

### AC-9: Git 历史查看
- **Given**: 仓库有多次提交记录
- **When**: 用户打开历史记录面板
- **Then**: 
  - 按时间倒序显示所有提交
  - 每条记录显示提交信息、时间、作者
  - 可查看任意提交的变更详情
- **Verification**: `programmatic`

### AC-10: Git 回滚
- **Given**: 仓库有多次提交，当前为最新版本
- **When**: 用户选择某历史版本并执行回滚
- **Then**: 
  - Skill 内容回滚到指定版本
  - Git HEAD 正确指向
  - UI 中内容正确刷新
- **Verification**: `programmatic`

### AC-11: 主界面布局与交互
- **Given**: 应用正常启动
- **When**: 用户浏览主界面
- **Then**: 
  - 左侧为分类/标签导航
  - 中间为 Skill 列表
  - 右侧为 Skill 详情/编辑器
  - 布局清晰，操作流畅
- **Verification**: `human-judgment`

### AC-12: 本地优先验证
- **Given**: 应用正常运行
- **When**: 检查网络请求和数据流向
- **Then**: 
  - 无任何对外网络请求
  - 所有数据存储在本地
  - 无账号登录要求
- **Verification**: `programmatic`

### AC-13: 工具路径自动检测
- **Given**: 系统安装了目标 AI 工具
- **When**: 用户首次打开设置页面
- **Then**: 
  - 自动检测并显示各工具的 Skill 目录路径
  - 未安装的工具显示"未检测到"
  - 支持手动修改路径
- **Verification**: `programmatic`

## Open Questions
- [ ] 技术栈选择：Electron + React vs Tauri + React？（当前假设 Electron）
- [ ] UI 组件库选择：Ant Design vs Material UI vs 自定义？
- [ ] 是否需要支持 Skill 的导入导出功能？
- [ ] 是否需要支持 Markdown 实时预览？
- [ ] Git 操作使用命令行调用还是使用 Node Git 库？
- [ ] 标准 Skill 格式采用 JSON 还是 YAML？
