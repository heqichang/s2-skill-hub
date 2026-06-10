import { useState, useEffect } from 'react'
import {
  Button,
  Tag,
  Space,
  Typography,
  Divider,
  Empty,
  Tooltip,
  Modal,
  Dropdown,
  List,
  Avatar,
  Spin
} from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  SyncOutlined,
  MoreOutlined,
  CalendarOutlined,
  TagOutlined,
  FolderOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CloudSyncOutlined,
  CloudOutlined
} from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useSkillStore } from '@renderer/store/useSkillStore'
import { useSyncStore } from '@renderer/store/useSyncStore'
import { useToast } from '@renderer/hooks/useToast'
import { SkillEditor } from '@renderer/components/SkillEditor'
import { formatDate, formatRelativeTime } from '@renderer/utils/format'
import { SyncStatus } from '@shared/types/skill'
import type { ToolType } from '@shared/types/adapter'
import styles from './SkillDetail.module.css'

const { Title, Text, Paragraph } = Typography
const { confirm } = Modal

export function SkillDetail() {
  const { skills, selectedSkillId, deleteSkill, fetchSkills } = useSkillStore()
  const { getSkillSyncStates, toolInfos, syncSkillToTool, syncSkillToAllTools, fetchSyncStates } =
    useSyncStore()
  const { success, error, contextHolder } = useToast()
  const [syncLoading, setSyncLoading] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const selectedSkill = skills.find((s) => s.id === selectedSkillId)
  const syncStates = selectedSkillId ? getSkillSyncStates(selectedSkillId) : []

  useEffect(() => {
    if (selectedSkillId && syncStates.length === 0) {
      fetchSyncStates(selectedSkillId)
    }
  }, [selectedSkillId, syncStates.length, fetchSyncStates])

  const handleDelete = () => {
    if (!selectedSkill) return
    confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除技能「${selectedSkill.name}」吗？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteSkill(selectedSkill.id)
          success('删除成功')
        } catch (err) {
          error('删除失败')
        }
      }
    })
  }

  const handleSync = async (toolType: ToolType) => {
    if (!selectedSkillId) return
    setSyncLoading(toolType)
    try {
      await syncSkillToTool(selectedSkillId, toolType)
      success('同步成功')
    } catch (err) {
      error('同步失败')
    } finally {
      setSyncLoading(null)
    }
  }

  const handleSyncAll = async () => {
    if (!selectedSkillId) return
    setSyncLoading('all')
    try {
      await syncSkillToAllTools(selectedSkillId)
      success('同步到所有工具成功')
    } catch (err) {
      error('同步失败')
    } finally {
      setSyncLoading(null)
    }
  }

  const getSyncStatusText = (status: SyncStatus) => {
    switch (status) {
      case SyncStatus.SYNCED:
        return '已同步'
      case SyncStatus.MODIFIED:
        return '有修改'
      case SyncStatus.UNSYNCED:
        return '未同步'
      default:
        return '未知'
    }
  }

  const getSyncStatusColor = (status: SyncStatus) => {
    switch (status) {
      case SyncStatus.SYNCED:
        return 'success'
      case SyncStatus.MODIFIED:
        return 'warning'
      case SyncStatus.UNSYNCED:
        return 'default'
      default:
        return 'default'
    }
  }

  const getSyncIcon = (status: SyncStatus) => {
    switch (status) {
      case SyncStatus.SYNCED:
        return <CheckOutlined style={{ color: '#52c41a' }} />
      case SyncStatus.MODIFIED:
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
      case SyncStatus.UNSYNCED:
        return <CloudOutlined style={{ color: '#bfbfbf' }} />
      default:
        return <CloudOutlined />
    }
  }

  const syncMenuItems = [
    {
      key: 'all',
      label: (
        <Space>
          <CloudSyncOutlined />
          同步到所有工具
        </Space>
      ),
      onClick: handleSyncAll
    },
    ...toolInfos
      .filter((tool) => tool.isInstalled)
      .map((tool) => ({
        key: tool.type,
        label: (
          <Space>
            <span>{tool.name}</span>
            {syncStates.find((s) => s.toolType === tool.type)?.status === SyncStatus.SYNCED && (
              <CheckOutlined style={{ color: '#52c41a' }} />
            )}
          </Space>
        ),
        onClick: () => handleSync(tool.type as ToolType)
      }))
  ]

  if (!selectedSkill) {
    return (
      <div className={styles.emptyContainer}>
        {contextHolder}
        <Empty description="请选择一个技能查看详情" />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {contextHolder}
      <SkillEditor
        open={editorOpen}
        skill={selectedSkill}
        onClose={() => setEditorOpen(false)}
        onSuccess={() => {
          fetchSkills()
        }}
      />

      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Title level={3} style={{ margin: 0 }}>
            {selectedSkill.name}
          </Title>
          <div className={styles.headerMeta}>
            <Tag icon={<FolderOutlined />} color="blue">
              {selectedSkill.category}
            </Tag>
            <Text type="secondary">
              <CalendarOutlined style={{ marginRight: 4 }} />
              更新于 {formatRelativeTime(selectedSkill.updatedAt)}
            </Text>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Space>
            <Tooltip title="编辑">
              <Button
                icon={<EditOutlined />}
                type="primary"
                ghost
                onClick={() => setEditorOpen(true)}
              />
            </Tooltip>
            <Dropdown menu={{ items: syncMenuItems }} placement="bottomRight">
              <Button icon={<SyncOutlined />} loading={syncLoading !== null}>
                同步
              </Button>
            </Dropdown>
            <Tooltip title="更多操作">
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'delete',
                      label: '删除',
                      icon: <DeleteOutlined />,
                      danger: true,
                      onClick: handleDelete
                    }
                  ]
                }}
                placement="bottomRight"
              >
                <Button icon={<MoreOutlined />} />
              </Dropdown>
            </Tooltip>
          </Space>
        </div>
      </div>

      <Divider style={{ margin: 0 }} />

      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <TagOutlined style={{ marginRight: 8 }} />
            标签
          </div>
          <div className={styles.tags}>
            {selectedSkill.tags.length > 0 ? (
              selectedSkill.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)
            ) : (
              <Text type="secondary">暂无标签</Text>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>描述</div>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {selectedSkill.description || '暂无描述'}
          </Paragraph>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>同步状态</div>
          {syncStates.length > 0 ? (
            <List
              size="small"
              dataSource={syncStates}
              renderItem={(state) => {
                const tool = toolInfos.find((t) => t.type === state.toolType)
                return (
                  <List.Item
                    actions={[
                      <Button
                        key="sync"
                        type="link"
                        size="small"
                        icon={<SyncOutlined />}
                        loading={syncLoading === state.toolType}
                        onClick={() => handleSync(state.toolType as ToolType)}
                      >
                        同步
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          size="small"
                          style={{ backgroundColor: '#1890ff' }}
                          icon={getSyncIcon(state.status)}
                        />
                      }
                      title={tool?.name || state.toolType}
                      description={
                        <Space size="small">
                          <Tag color={getSyncStatusColor(state.status)}>
                            {getSyncStatusText(state.status)}
                          </Tag>
                          {state.lastSyncAt && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              <ClockCircleOutlined style={{ marginRight: 2 }} />
                              {formatDate(state.lastSyncAt)}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )
              }}
            />
          ) : (
            <div className={styles.emptySync}>
              <Spin size="small" />
              <Text type="secondary" style={{ marginLeft: 8 }}>
                加载同步状态中...
              </Text>
            </div>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>详细信息</div>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <Text type="secondary">创建时间</Text>
              <Text>{formatDate(selectedSkill.createdAt)}</Text>
            </div>
            <div className={styles.infoItem}>
              <Text type="secondary">更新时间</Text>
              <Text>{formatDate(selectedSkill.updatedAt)}</Text>
            </div>
            <div className={styles.infoItem}>
              <Text type="secondary">ID</Text>
              <Text code>{selectedSkill.id}</Text>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>技能内容</div>
          <div className={styles.contentMarkdown}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {selectedSkill.content || '*暂无内容*'}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}
