import { useState, useEffect } from 'react'
import {
  Tabs,
  Form,
  Input,
  Button,
  Switch,
  Space,
  Typography,
  Tag,
  Divider,
  Alert,
  Spin,
  Tooltip
} from 'antd'
import type { TabsProps } from 'antd'
import {
  FolderOutlined,
  ToolOutlined,
  GitlabOutlined,
  BulbOutlined,
  SunOutlined,
  MoonOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
  SaveOutlined,
  InfoCircleOutlined,
  UnorderedListOutlined,
  AppstoreAddOutlined
} from '@ant-design/icons'
import { useAppStore } from '@renderer/store/useAppStore'
import { useSkillStore } from '@renderer/store/useSkillStore'
import { useSyncStore } from '@renderer/store/useSyncStore'
import { useToast } from '@renderer/hooks/useToast'
import { THEME_MODES, VIEW_MODES } from '@renderer/utils/constants'
import { isIpcSuccess } from '@renderer/utils/ipc'
import { ToolType } from '@shared/types/adapter'
import type { Config } from '@main/services/config'
import styles from './SettingsPanel.module.css'

const { Title, Text } = Typography

interface SettingsPanelProps {
  onClose?: () => void
}

export function SettingsPanel({ onClose: _onClose }: SettingsPanelProps) {
  const { theme, viewMode, setTheme, setViewMode } = useAppStore()
  const { isRepoInitialized, checkRepoInitialized, fetchSkills, fetchCategories } = useSkillStore()
  const { toolInfos, fetchToolInfos } = useSyncStore()
  const { success, error, contextHolder } = useToast()

  const [repoPath, setRepoPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [repoStatusLoading, setRepoStatusLoading] = useState(false)
  const [toolConfigs, setToolConfigs] = useState<
    Map<ToolType, { enabled: boolean; path: string | null }>
  >(new Map())
  const [gitForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState('repo')

  useEffect(() => {
    loadConfig()
  }, [])

  useEffect(() => {
    if (toolInfos.length > 0) {
      const newConfigs = new Map<ToolType, { enabled: boolean; path: string | null }>()
      toolInfos.forEach((tool) => {
        newConfigs.set(tool.type, {
          enabled: tool.isInstalled,
          path: tool.skillDirPath
        })
      })
      setToolConfigs(newConfigs)
    }
  }, [toolInfos])

  const loadConfig = async () => {
    setLoading(true)
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.config.get()
        if (isIpcSuccess(response)) {
          const cfg = response.data.config
          setRepoPath(cfg.repoPath)
          gitForm.setFieldsValue({
            name: cfg.git.name || '',
            email: cfg.git.email || ''
          })
        }
      }
    } catch (err) {
      console.error('加载配置失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRepoPath = async () => {
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.config.selectDirectory({
          title: '选择 Skill 仓库目录',
          defaultPath: repoPath || undefined
        })
        if (isIpcSuccess(response) && response.data.path) {
          const newPath = response.data.path
          if (repoPath && repoPath !== newPath) {
            if (!confirm('确定要切换仓库路径吗？切换后将重新加载数据。')) {
              return
            }
          }
          setRepoPath(newPath)
          await saveRepoPath(newPath)
        }
      }
    } catch (err) {
      error('选择目录失败')
    }
  }

  const saveRepoPath = async (path: string) => {
    setLoading(true)
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.config.setRepoPath({ repoPath: path })
        if (isIpcSuccess(response)) {
          success('仓库路径已更新')
          await checkRepoInitialized()
          await fetchSkills()
          await fetchCategories()
          await fetchToolInfos()
        } else {
          error(response.error.message)
        }
      }
    } catch (err) {
      error('保存仓库路径失败')
    } finally {
      setLoading(false)
    }
  }

  const handleInitRepo = async () => {
    if (!repoPath) {
      error('请先选择仓库路径')
      return
    }
    setLoading(true)
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.repo.init({ repoPath })
        if (isIpcSuccess(response)) {
          success('仓库初始化成功')
          await checkRepoInitialized()
          await fetchSkills()
          await fetchCategories()
        } else {
          error(response.error.message)
        }
      }
    } catch (err) {
      error('初始化仓库失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckRepoStatus = async () => {
    setRepoStatusLoading(true)
    try {
      await checkRepoInitialized()
      success('状态已刷新')
    } catch (err) {
      error('刷新状态失败')
    } finally {
      setRepoStatusLoading(false)
    }
  }

  const handleAutoDetectTool = async (toolType: ToolType) => {
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.sync.getToolInfo({ toolType })
        if (isIpcSuccess(response)) {
          const tool = response.data.tool
          setToolConfigs((prev) => {
            const newMap = new Map(prev)
            newMap.set(toolType, {
              enabled: tool.isInstalled,
              path: tool.skillDirPath
            })
            return newMap
          })
          await fetchToolInfos()
          success(tool.isInstalled ? '检测成功' : '未检测到该工具')
        }
      }
    } catch (err) {
      error('检测失败')
    }
  }

  const handleSelectToolPath = async (toolType: ToolType) => {
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const currentPath = toolConfigs.get(toolType)?.path
        const response = await window.ipcApi.config.selectDirectory({
          title: '选择 Skill 目录',
          defaultPath: currentPath || undefined
        })
        if (isIpcSuccess(response) && response.data.path) {
          const newPath = response.data.path
          setToolConfigs((prev) => {
            const newMap = new Map(prev)
            const current = newMap.get(toolType) || { enabled: false, path: null }
            newMap.set(toolType, { ...current, path: newPath })
            return newMap
          })
          await saveToolConfig(toolType, newPath)
        }
      }
    } catch (err) {
      error('选择目录失败')
    }
  }

  const saveToolConfig = async (toolType: ToolType, path: string) => {
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.config.set({
          config: {
            tools: {
              [toolType]: { skillDirPath: path }
            } as Config['tools']
          }
        })
        if (isIpcSuccess(response)) {
          success('配置已保存')
          await fetchToolInfos()
        }
      }
    } catch (err) {
      error('保存配置失败')
    }
  }

  const handleToggleTool = async (toolType: ToolType, enabled: boolean) => {
    setToolConfigs((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(toolType) || { enabled: false, path: null }
      newMap.set(toolType, { ...current, enabled })
      return newMap
    })
  }

  const handleSaveGitConfig = async () => {
    try {
      const values = await gitForm.validateFields()
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.config.set({
          config: {
            git: {
              name: values.name,
              email: values.email
            }
          }
        })
        if (isIpcSuccess(response)) {
          success('Git 配置已保存')
        } else {
          error(response.error.message)
        }
      }
    } catch (err) {
      // validation error
    }
  }

  const getToolIcon = (type: ToolType) => {
    const colors: Record<ToolType, string> = {
      [ToolType.CLAUDE]: '#7c3aed',
      [ToolType.CURSOR]: '#000000',
      [ToolType.TRAE]: '#1890ff'
    }
    return (
      <div className={styles.toolIcon} style={{ backgroundColor: colors[type] }}>
        {type.charAt(0).toUpperCase()}
      </div>
    )
  }

  const getToolName = (type: ToolType) => {
    const names: Record<ToolType, string> = {
      [ToolType.CLAUDE]: 'Claude',
      [ToolType.CURSOR]: 'Cursor',
      [ToolType.TRAE]: 'Trae'
    }
    return names[type]
  }

  const getToolDescription = (type: ToolType) => {
    const descriptions: Record<ToolType, string> = {
      [ToolType.CLAUDE]: 'Anthropic 的 AI 助手',
      [ToolType.CURSOR]: 'AI 驱动的代码编辑器',
      [ToolType.TRAE]: 'Trae AI 助手'
    }
    return descriptions[type]
  }

  const items: TabsProps['items'] = [
    {
      key: 'repo',
      label: (
        <Space>
          <FolderOutlined />
          仓库
        </Space>
      ),
      children: (
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <Title level={5} style={{ marginTop: 0 }}>
              仓库设置
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              配置 Skill 仓库的存储位置
            </Text>

            <div className={styles.formItem}>
              <label className={styles.formLabel}>仓库路径</label>
              <Input
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                placeholder="请选择或输入仓库路径"
                readOnly
                suffix={
                  <Button
                    type="text"
                    size="small"
                    icon={<FolderOpenOutlined />}
                    onClick={handleSelectRepoPath}
                  >
                    选择目录
                  </Button>
                }
              />
            </div>

            <div className={styles.formItem}>
              <label className={styles.formLabel}>仓库状态</label>
              <div className={styles.statusRow}>
                <Space>
                  {isRepoInitialized ? (
                    <Tag icon={<CheckCircleOutlined />} color="success">
                      已初始化
                    </Tag>
                  ) : (
                    <Tag icon={<CloseCircleOutlined />} color="warning">
                      未初始化
                    </Tag>
                  )}
                  <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined spin={repoStatusLoading} />}
                    onClick={handleCheckRepoStatus}
                  >
                    刷新
                  </Button>
                </Space>
              </div>
            </div>

            {!isRepoInitialized && repoPath && (
              <Alert
                message="仓库未初始化"
                description="选择路径后，需要初始化仓库才能开始使用"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Space style={{ width: '100%' }}>
              <Button
                type="primary"
                icon={<FolderOutlined />}
                onClick={handleSelectRepoPath}
                loading={loading}
              >
                {repoPath ? '更换目录' : '选择目录'}
              </Button>
              {!isRepoInitialized && repoPath && (
                <Button icon={<AppstoreOutlined />} onClick={handleInitRepo} loading={loading}>
                  初始化仓库
                </Button>
              )}
            </Space>
          </div>
        </div>
      )
    },
    {
      key: 'tools',
      label: (
        <Space>
          <ToolOutlined />
          工具
        </Space>
      ),
      children: (
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <Title level={5} style={{ marginTop: 0 }}>
              同步工具
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              配置需要同步 Skill 的 AI 工具
            </Text>

            <div className={styles.toolList}>
              {toolInfos.map((tool) => {
                const toolConfig = toolConfigs.get(tool.type)
                return (
                  <div key={tool.type} className={styles.toolCard}>
                    <div className={styles.toolCardHeader}>
                      <Space>
                        {getToolIcon(tool.type)}
                        <div>
                          <div className={styles.toolName}>{getToolName(tool.type)}</div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {getToolDescription(tool.type)}
                          </Text>
                        </div>
                      </Space>
                      <Switch
                        checked={toolConfig?.enabled ?? tool.isInstalled}
                        onChange={(checked) => handleToggleTool(tool.type, checked)}
                        disabled={!tool.isInstalled && !toolConfig?.path}
                      />
                    </div>

                    <Divider style={{ margin: '12px 0' }} />

                    <div className={styles.toolCardBody}>
                      <div className={styles.toolStatus}>
                        <Space size="small">
                          {tool.isInstalled ? (
                            <Tag icon={<CheckCircleOutlined />} color="success">
                              已安装
                            </Tag>
                          ) : (
                            <Tag icon={<CloseCircleOutlined />} color="default">
                              未检测到
                            </Tag>
                          )}
                        </Space>
                      </div>

                      <div className={styles.formItem}>
                        <label className={styles.formLabel}>Skill 目录</label>
                        <Input
                          value={toolConfig?.path || ''}
                          placeholder="未配置"
                          readOnly
                          size="small"
                          suffix={
                            <Button
                              type="text"
                              size="small"
                              icon={<FolderOpenOutlined />}
                              onClick={() => handleSelectToolPath(tool.type)}
                            >
                              选择
                            </Button>
                          }
                        />
                      </div>

                      <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        onClick={() => handleAutoDetectTool(tool.type)}
                        block
                      >
                        自动检测
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'git',
      label: (
        <Space>
          <GitlabOutlined />
          Git
        </Space>
      ),
      children: (
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <Title level={5} style={{ marginTop: 0 }}>
              Git 配置
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              配置 Git 提交时使用的用户信息
            </Text>

            <Form form={gitForm} layout="vertical">
              <Form.Item
                label="Git 用户名"
                name="name"
                rules={[{ required: true, message: '请输入 Git 用户名' }]}
              >
                <Input placeholder="请输入 Git 用户名" />
              </Form.Item>

              <Form.Item
                label="Git 邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入 Git 邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入 Git 邮箱" />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveGitConfig}
                  loading={loading}
                >
                  保存配置
                </Button>
              </Form.Item>
            </Form>

            <Divider />

            <div className={styles.gitStatusSection}>
              <Title level={5}>Git 仓库状态</Title>
              <Space>
                <Tooltip
                  title={isRepoInitialized ? '当前目录是 Git 仓库' : '当前目录不是 Git 仓库'}
                >
                  {isRepoInitialized ? (
                    <Tag icon={<CheckCircleOutlined />} color="success">
                      Git 仓库已就绪
                    </Tag>
                  ) : (
                    <Tag icon={<InfoCircleOutlined />} color="warning">
                      未检测到 Git 仓库
                    </Tag>
                  )}
                </Tooltip>
              </Space>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'appearance',
      label: (
        <Space>
          <BulbOutlined />
          外观
        </Space>
      ),
      children: (
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <Title level={5} style={{ marginTop: 0 }}>
              主题模式
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              选择你喜欢的界面主题
            </Text>

            <div className={styles.themeOptions}>
              <div
                className={`${styles.themeOption} ${theme === THEME_MODES.LIGHT ? styles.themeOptionActive : ''}`}
                onClick={() => setTheme(THEME_MODES.LIGHT)}
              >
                <div className={styles.themePreviewLight}>
                  <SunOutlined style={{ fontSize: 24, color: '#faad14' }} />
                </div>
                <div className={styles.themeOptionLabel}>
                  <Space>
                    <SunOutlined />
                    浅色模式
                  </Space>
                  {theme === THEME_MODES.LIGHT && (
                    <CheckCircleOutlined style={{ color: '#1890ff' }} />
                  )}
                </div>
              </div>

              <div
                className={`${styles.themeOption} ${theme === THEME_MODES.DARK ? styles.themeOptionActive : ''}`}
                onClick={() => setTheme(THEME_MODES.DARK)}
              >
                <div className={styles.themePreviewDark}>
                  <MoonOutlined style={{ fontSize: 24, color: '#fff' }} />
                </div>
                <div className={styles.themeOptionLabel}>
                  <Space>
                    <MoonOutlined />
                    深色模式
                  </Space>
                  {theme === THEME_MODES.DARK && (
                    <CheckCircleOutlined style={{ color: '#1890ff' }} />
                  )}
                </div>
              </div>
            </div>

            <Divider />

            <Title level={5}>视图模式</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              选择技能列表的展示方式
            </Text>

            <div className={styles.viewModeOptions}>
              <div
                className={`${styles.viewModeOption} ${viewMode === VIEW_MODES.LIST ? styles.viewModeOptionActive : ''}`}
                onClick={() => setViewMode(VIEW_MODES.LIST)}
              >
                <UnorderedListOutlined style={{ fontSize: 20 }} />
                <span>列表视图</span>
              </div>
              <div
                className={`${styles.viewModeOption} ${viewMode === VIEW_MODES.CARD ? styles.viewModeOptionActive : ''}`}
                onClick={() => setViewMode(VIEW_MODES.CARD)}
              >
                <AppstoreAddOutlined style={{ fontSize: 20 }} />
                <span>卡片视图</span>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className={styles.container}>
      {contextHolder}
      <Spin spinning={loading && !repoPath}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} className={styles.tabs} />
      </Spin>
    </div>
  )
}
