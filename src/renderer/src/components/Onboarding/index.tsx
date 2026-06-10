import { useState, useEffect } from 'react'
import { Button, Space, Typography, Steps, Input, Tag, Spin, Divider, Result, Card } from 'antd'
import {
  AppstoreOutlined,
  FolderOpenOutlined,
  ToolOutlined,
  RocketOutlined,
  CheckCircleOutlined,
  RightOutlined,
  LeftOutlined,
  ForwardOutlined,
  ReloadOutlined,
  GitlabOutlined
} from '@ant-design/icons'
import { useSkillStore } from '@renderer/store/useSkillStore'
import { useSyncStore } from '@renderer/store/useSyncStore'
import { useToast } from '@renderer/hooks/useToast'
import { isIpcSuccess } from '@renderer/utils/ipc'
import { ToolType } from '@shared/types/adapter'
import type { ToolInfo } from '@shared/types/adapter'
import styles from './Onboarding.module.css'

const { Title, Text, Paragraph } = Typography

interface OnboardingProps {
  onComplete: () => void
  onSkip?: () => void
}

export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [repoPath, setRepoPath] = useState('')
  const [isRepoInitialized, setIsRepoInitialized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [, setDetectedTools] = useState<ToolInfo[]>([])
  const { checkRepoInitialized, fetchSkills, fetchCategories } = useSkillStore()
  const { fetchToolInfos, toolInfos } = useSyncStore()
  const { success, error, contextHolder } = useToast()

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    setLoading(true)
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.config.getRepoPath()
        if (isIpcSuccess(response)) {
          setRepoPath(response.data.repoPath)
        }
      }
      await checkRepoInitialized()
      await fetchToolInfos()
    } catch (err) {
      console.error('加载初始数据失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRepoPath = async () => {
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.config.selectDirectory({
          title: '选择 Skill 仓库目录'
        })
        if (isIpcSuccess(response) && response.data.path) {
          setRepoPath(response.data.path)
          setIsRepoInitialized(false)
        }
      }
    } catch (err) {
      error('选择目录失败')
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
          setIsRepoInitialized(true)
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

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleDetectTools = async () => {
    setDetecting(true)
    try {
      await fetchToolInfos()
      setDetectedTools(toolInfos)
      const installedCount = toolInfos.filter((t) => t.isInstalled).length
      success(`检测完成，发现 ${installedCount} 个已安装工具`)
    } catch (err) {
      error('检测失败')
    } finally {
      setDetecting(false)
    }
  }

  const handleComplete = () => {
    onComplete()
  }

  const handleSkip = () => {
    if (onSkip) {
      onSkip()
    } else {
      onComplete()
    }
  }

  const steps = [
    {
      title: '欢迎',
      icon: <AppstoreOutlined />
    },
    {
      title: '仓库设置',
      icon: <FolderOpenOutlined />
    },
    {
      title: '工具检测',
      icon: <ToolOutlined />
    },
    {
      title: '完成',
      icon: <RocketOutlined />
    }
  ]

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className={styles.welcomeSection}>
            <div className={styles.logo}>
              <AppstoreOutlined style={{ fontSize: 64, color: '#1890ff' }} />
            </div>
            <Title level={2} style={{ marginBottom: 16 }}>
              欢迎使用 Skill Hub
            </Title>
            <Paragraph type="secondary" style={{ fontSize: 16, marginBottom: 32 }}>
              一站式 AI 技能管理中心，轻松管理和同步你的所有 Skills
            </Paragraph>

            <div className={styles.features}>
              <Card className={styles.featureCard}>
                <AppstoreOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                <Title level={5} style={{ marginTop: 12 }}>
                  集中管理
                </Title>
                <Text type="secondary">统一管理所有 AI 工具的 Skills</Text>
              </Card>
              <Card className={styles.featureCard}>
                <ToolOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                <Title level={5} style={{ marginTop: 12 }}>
                  多工具同步
                </Title>
                <Text type="secondary">一键同步到 Claude、Cursor、Trae 等工具</Text>
              </Card>
              <Card className={styles.featureCard}>
                <GitlabOutlined style={{ fontSize: 32, color: '#722ed1' }} />
                <Title level={5} style={{ marginTop: 12 }}>
                  版本控制
                </Title>
                <Text type="secondary">内置 Git 版本管理，随时回溯历史</Text>
              </Card>
            </div>
          </div>
        )

      case 1:
        return (
          <div className={styles.stepContent}>
            <Title level={4} style={{ marginBottom: 8 }}>
              设置 Skill 仓库
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
              选择一个目录作为你的 Skill 仓库，所有 Skills 都将保存在这里
            </Text>

            <div className={styles.formSection}>
              <label className={styles.formLabel}>仓库路径</label>
              <Input
                value={repoPath}
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
                style={{ marginBottom: 16 }}
              />

              <div className={styles.statusRow}>
                <Text>仓库状态：</Text>
                {isRepoInitialized ? (
                  <Tag icon={<CheckCircleOutlined />} color="success">
                    已初始化
                  </Tag>
                ) : (
                  <Tag color="warning">未初始化</Tag>
                )}
              </div>

              {!isRepoInitialized && repoPath && (
                <Button
                  type="primary"
                  icon={<AppstoreOutlined />}
                  onClick={handleInitRepo}
                  loading={loading}
                  block
                  style={{ marginTop: 16 }}
                >
                  初始化仓库
                </Button>
              )}

              {isRepoInitialized && (
                <div className={styles.successTip}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  <Text>仓库已准备就绪</Text>
                </div>
              )}
            </div>
          </div>
        )

      case 2:
        return (
          <div className={styles.stepContent}>
            <Title level={4} style={{ marginBottom: 8 }}>
              检测 AI 工具
            </Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
              自动检测你电脑上已安装的 AI 工具，以便同步 Skills
            </Text>

            <Button
              type="primary"
              icon={<ReloadOutlined spin={detecting} />}
              onClick={handleDetectTools}
              loading={detecting}
              block
              style={{ marginBottom: 24 }}
            >
              {detecting ? '检测中...' : '开始检测'}
            </Button>

            {toolInfos.length > 0 && (
              <div className={styles.toolList}>
                {toolInfos.map((tool) => (
                  <div key={tool.type} className={styles.toolItem}>
                    <div
                      className={styles.toolIcon}
                      style={{
                        backgroundColor:
                          tool.type === ToolType.CLAUDE
                            ? '#7c3aed'
                            : tool.type === ToolType.CURSOR
                              ? '#000'
                              : '#1890ff'
                      }}
                    >
                      {tool.name.charAt(0)}
                    </div>
                    <div className={styles.toolInfo}>
                      <div className={styles.toolName}>{tool.name}</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {tool.description}
                      </Text>
                    </div>
                    {tool.isInstalled ? (
                      <Tag icon={<CheckCircleOutlined />} color="success">
                        已安装
                      </Tag>
                    ) : (
                      <Tag color="default">未检测到</Tag>
                    )}
                  </div>
                ))}
              </div>
            )}

            {toolInfos.length === 0 && !detecting && (
              <div className={styles.emptyTip}>
                <Text type="secondary">点击上方按钮开始检测</Text>
              </div>
            )}
          </div>
        )

      case 3:
        return (
          <div className={styles.completeSection}>
            <Result
              icon={<RocketOutlined style={{ color: '#1890ff' }} />}
              title="配置完成！"
              subTitle="你已完成 Skill Hub 的初始配置，现在可以开始使用了"
              extra={
                <Space>
                  <Button type="primary" size="large" onClick={handleComplete}>
                    开始使用
                    <RightOutlined />
                  </Button>
                </Space>
              }
            />

            <Divider />

            <div className={styles.summary}>
              <Title level={5}>配置摘要</Title>
              <div className={styles.summaryItem}>
                <Text type="secondary">仓库位置：</Text>
                <Text>{repoPath || '未设置'}</Text>
              </div>
              <div className={styles.summaryItem}>
                <Text type="secondary">已检测工具：</Text>
                <Text>
                  {toolInfos.filter((t) => t.isInstalled).length} / {toolInfos.length || 3} 个
                </Text>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={styles.container}>
      {contextHolder}
      <Spin spinning={loading && currentStep === 1}>
        <div className={styles.content}>
          <Steps current={currentStep} items={steps} className={styles.steps} size="small" />

          <div className={styles.stepContentContainer}>{renderStepContent()}</div>

          <div className={styles.footer}>
            <Space>
              {currentStep > 0 && (
                <Button icon={<LeftOutlined />} onClick={handlePrev}>
                  上一步
                </Button>
              )}
              {currentStep < 3 && (
                <Button
                  type="primary"
                  onClick={handleNext}
                  disabled={currentStep === 1 && !isRepoInitialized}
                >
                  下一步
                  <RightOutlined />
                </Button>
              )}
            </Space>

            {currentStep < 3 && (
              <Button type="text" icon={<ForwardOutlined />} onClick={handleSkip}>
                跳过引导
              </Button>
            )}
          </div>
        </div>
      </Spin>
    </div>
  )
}
