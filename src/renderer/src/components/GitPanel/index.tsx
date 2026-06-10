import { useState, useMemo } from 'react'
import {
  Tabs,
  List,
  Button,
  Input,
  Tag,
  Space,
  Typography,
  Badge,
  Divider,
  Modal,
  Checkbox,
  Empty,
  Spin,
  Collapse,
  Tooltip
} from 'antd'
import type { TabsProps } from 'antd'
import {
  GitlabOutlined,
  FileOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  RollbackOutlined,
  SaveOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  EyeOutlined
} from '@ant-design/icons'
import { useGitStore } from '@renderer/store/useGitStore'
import { useToast } from '@renderer/hooks/useToast'
import { formatRelativeTime } from '@renderer/utils/format'
import type { GitDiffStatus, GitCommit, GitDiff } from '@shared/types/git'
import styles from './GitPanel.module.css'

const { Title, Text } = Typography
const { TextArea } = Input
const { confirm } = Modal
const { Panel } = Collapse

export function GitPanel() {
  const { status, history, commit, rollback, isLoading, fetchStatus, fetchHistory, getFileDiff } =
    useGitStore()
  const { success, error, contextHolder } = useToast()
  const [commitMessage, setCommitMessage] = useState('')
  const [activeTab, setActiveTab] = useState('status')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [diffModalVisible, setDiffModalVisible] = useState(false)
  const [currentDiffFile, setCurrentDiffFile] = useState('')
  const [currentDiffContent, setCurrentDiffContent] = useState('')
  const [diffLoading, setDiffLoading] = useState(false)
  const [commitFiles, setCommitFiles] = useState<GitDiff[]>([])

  const allSelected = useMemo(() => {
    if (!status?.changedFiles.length) return false
    return status.changedFiles.every((f) => selectedFiles.has(f.file))
  }, [status?.changedFiles, selectedFiles])

  const handleToggleSelectAll = (checked: boolean) => {
    if (checked && status?.changedFiles) {
      setSelectedFiles(new Set(status.changedFiles.map((f) => f.file)))
    } else {
      setSelectedFiles(new Set())
    }
  }

  const handleToggleFile = (file: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(file)) {
        newSet.delete(file)
      } else {
        newSet.add(file)
      }
      return newSet
    })
  }

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      error('请输入提交信息')
      return
    }
    try {
      await commit(commitMessage)
      success('提交成功')
      setCommitMessage('')
      setSelectedFiles(new Set())
      await fetchHistory()
    } catch (err) {
      error('提交失败')
    }
  }

  const handleRollback = (hash: string, message: string) => {
    confirm({
      title: '确认回滚',
      icon: <ExclamationCircleOutlined />,
      content: `确定要回滚到提交「${message}」吗？这将撤销该提交之后的所有更改。`,
      okText: '回滚',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await rollback(hash)
          success('回滚成功')
          await fetchStatus()
          await fetchHistory()
        } catch (err) {
          error('回滚失败')
        }
      }
    })
  }

  const handleViewDiff = async (filePath: string, hash?: string) => {
    setDiffLoading(true)
    setCurrentDiffFile(filePath)
    setDiffModalVisible(true)
    try {
      const diff = await getFileDiff(filePath, hash)
      setCurrentDiffContent(diff)
    } catch (err) {
      error('获取差异失败')
      setCurrentDiffContent('')
    } finally {
      setDiffLoading(false)
    }
  }

  const handleViewCommit = async (commitItem: GitCommit) => {
    try {
      const diffs = await useGitStore.getState().getDiff(commitItem.hash)
      setCommitFiles(diffs)
    } catch (err) {
      setCommitFiles([])
    }
  }

  const getDiffIcon = (status: GitDiffStatus) => {
    switch (status) {
      case 'added':
        return <PlusOutlined style={{ color: '#52c41a' }} />
      case 'modified':
        return <EditOutlined style={{ color: '#faad14' }} />
      case 'deleted':
        return <DeleteOutlined style={{ color: '#ff4d4f' }} />
      default:
        return <FileOutlined />
    }
  }

  const getDiffTagColor = (status: GitDiffStatus) => {
    switch (status) {
      case 'added':
        return 'success'
      case 'modified':
        return 'warning'
      case 'deleted':
        return 'error'
      default:
        return 'default'
    }
  }

  const getDiffStatusText = (status: GitDiffStatus) => {
    switch (status) {
      case 'added':
        return '新增'
      case 'modified':
        return '修改'
      case 'deleted':
        return '删除'
      default:
        return status
    }
  }

  const parseDiffLines = (content: string) => {
    const lines = content.split('\n')
    return lines.map((line, index) => {
      let type: 'add' | 'remove' | 'context' | 'header' | 'info' = 'context'
      if (line.startsWith('@@')) {
        type = 'header'
      } else if (line.startsWith('---') || line.startsWith('+++')) {
        type = 'info'
      } else if (line.startsWith('+')) {
        type = 'add'
      } else if (line.startsWith('-')) {
        type = 'remove'
      }
      return { line: line || ' ', type, index }
    })
  }

  const items: TabsProps['items'] = [
    {
      key: 'status',
      label: (
        <Space>
          <GitlabOutlined />
          工作区
          {status?.hasChanges && <Badge count={status.changedFiles.length} size="small" />}
        </Space>
      ),
      children: (
        <div className={styles.tabContent}>
          {status?.hasChanges ? (
            <>
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Title level={5} style={{ marginTop: 0, marginBottom: 0 }}>
                    变更文件
                  </Title>
                  <Space>
                    <Checkbox
                      checked={allSelected}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                    >
                      全选
                    </Checkbox>
                    <Button
                      type="text"
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={fetchStatus}
                    >
                      刷新
                    </Button>
                  </Space>
                </div>

                <List
                  size="small"
                  dataSource={status.changedFiles}
                  className={styles.fileList}
                  renderItem={(file) => (
                    <List.Item
                      className={styles.fileItem}
                      onClick={() => handleViewDiff(file.file)}
                    >
                      <List.Item.Meta
                        avatar={
                          <Checkbox
                            checked={selectedFiles.has(file.file)}
                            onChange={(e) => {
                              e.stopPropagation()
                              handleToggleFile(file.file)
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        }
                        title={
                          <Space>
                            {getDiffIcon(file.status)}
                            <span className={styles.fileName}>{file.file}</span>
                            <Tag color={getDiffTagColor(file.status)}>
                              {getDiffStatusText(file.status)}
                            </Tag>
                          </Space>
                        }
                        description={
                          file.additions !== undefined && file.deletions !== undefined ? (
                            <Space size="small">
                              <Text type="success" style={{ fontSize: 12 }}>
                                +{file.additions}
                              </Text>
                              <Text type="danger" style={{ fontSize: 12 }}>
                                -{file.deletions}
                              </Text>
                            </Space>
                          ) : null
                        }
                      />
                      <Tooltip title="查看差异">
                        <Button
                          type="text"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewDiff(file.file)
                          }}
                        />
                      </Tooltip>
                    </List.Item>
                  )}
                />
              </div>

              <Divider />

              <div className={styles.section}>
                <Title level={5}>提交更改</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
                  已选择 {selectedFiles.size} 个文件
                </Text>
                <TextArea
                  rows={3}
                  placeholder="输入提交信息..."
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  style={{ marginBottom: 12 }}
                />
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleCommit}
                  loading={isLoading}
                  block
                  disabled={selectedFiles.size === 0}
                >
                  提交更改
                </Button>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
              <Text type="secondary">工作区干净，没有未提交的更改</Text>
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={fetchStatus}
                style={{ marginTop: 12 }}
              >
                刷新状态
              </Button>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'history',
      label: (
        <Space>
          <ClockCircleOutlined />
          历史
        </Space>
      ),
      children: (
        <div className={styles.tabContent}>
          <div className={styles.sectionHeader} style={{ marginBottom: 12 }}>
            <Title level={5} style={{ marginTop: 0, marginBottom: 0 }}>
              提交历史
            </Title>
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => fetchHistory()}
            >
              刷新
            </Button>
          </div>

          {history.length > 0 ? (
            <Collapse
              accordion
              ghost
              className={styles.commitList}
              onChange={(key) => {
                if (key) {
                  const hash = Array.isArray(key) ? key[0] : key
                  if (hash) {
                    const commitItem = history.find((c) => c.hash === hash)
                    if (commitItem) {
                      handleViewCommit(commitItem)
                    }
                  }
                }
              }}
            >
              {history.map((item) => (
                <Panel
                  key={item.hash}
                  header={
                    <div className={styles.commitHeader}>
                      <div className={styles.commitMessage}>{item.message}</div>
                      <div className={styles.commitMeta}>
                        <Space size="large">
                          <Tag color="blue" style={{ margin: 0 }}>
                            {item.shortHash}
                          </Tag>
                          <Space size="small">
                            <UserOutlined style={{ fontSize: 12 }} />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {item.author}
                            </Text>
                          </Space>
                          <Space size="small">
                            <ClockCircleOutlined style={{ fontSize: 12 }} />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {formatRelativeTime(item.date)}
                            </Text>
                          </Space>
                        </Space>
                      </div>
                    </div>
                  }
                  extra={
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<RollbackOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRollback(item.hash, item.message)
                      }}
                    >
                      回滚
                    </Button>
                  }
                >
                  <div className={styles.commitDetail}>
                    <div className={styles.commitDetailHeader}>
                      <Text strong>变更文件</Text>
                      <Tag color="default">{commitFiles.length} 个文件</Tag>
                    </div>
                    <List
                      size="small"
                      dataSource={commitFiles}
                      locale={{ emptyText: '暂无文件变更信息' }}
                      renderItem={(file) => (
                        <List.Item
                          className={styles.commitFileItem}
                          onClick={() => handleViewDiff(file.file, item.hash)}
                        >
                          <Space>
                            {getDiffIcon(file.status)}
                            <span>{file.file}</span>
                            <Tag color={getDiffTagColor(file.status)}>
                              {getDiffStatusText(file.status)}
                            </Tag>
                            {file.additions !== undefined && file.deletions !== undefined && (
                              <Space size="small">
                                <Text type="success" style={{ fontSize: 12 }}>
                                  +{file.additions}
                                </Text>
                                <Text type="danger" style={{ fontSize: 12 }}>
                                  -{file.deletions}
                                </Text>
                              </Space>
                            )}
                          </Space>
                          <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewDiff(file.file, item.hash)
                            }}
                          >
                            查看
                          </Button>
                        </List.Item>
                      )}
                    />
                  </div>
                </Panel>
              ))}
            </Collapse>
          ) : (
            <Empty description="暂无提交记录" />
          )}
        </div>
      )
    }
  ]

  const diffLines = parseDiffLines(currentDiffContent)

  return (
    <div className={styles.container}>
      {contextHolder}
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />

      <Modal
        title={
          <Space>
            <FileOutlined />
            {currentDiffFile}
          </Space>
        }
        open={diffModalVisible}
        onCancel={() => setDiffModalVisible(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Spin spinning={diffLoading}>
          {diffLines.length > 0 ? (
            <div className={styles.diffViewer}>
              {diffLines.map(({ line, type, index }) => (
                <div
                  key={index}
                  className={`${styles.diffLine} ${styles[`diffLine${type.charAt(0).toUpperCase() + type.slice(1)}`]}`}
                >
                  <span className={styles.diffLineNum}>{index + 1}</span>
                  <span className={styles.diffLineContent}>{line}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty description="暂无差异内容" />
          )}
        </Spin>
      </Modal>
    </div>
  )
}
