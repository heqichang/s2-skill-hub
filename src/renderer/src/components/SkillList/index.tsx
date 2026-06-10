import { useState, useMemo, useEffect } from 'react'
import {
  Input,
  Button,
  List,
  Card,
  Tag,
  Tooltip,
  Empty,
  Space,
  Badge,
  Typography,
  Divider,
  Checkbox,
  Dropdown,
  Modal,
  Spin
} from 'antd'
import {
  SearchOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  SyncOutlined,
  CheckOutlined,
  WarningOutlined,
  DeleteOutlined,
  DownOutlined,
  CloseCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useSkillStore } from '@renderer/store/useSkillStore'
import { useSyncStore } from '@renderer/store/useSyncStore'
import { useToast } from '@renderer/hooks/useToast'
import { useDebounce } from '@renderer/hooks/useDebounce'
import { SkillEditor } from '@renderer/components/SkillEditor'
import type { Skill } from '@shared/types/skill'
import { SyncStatus } from '@shared/types/skill'
import type { ToolType } from '@shared/types/adapter'
import { VIEW_MODES } from '@renderer/utils/constants'
import { formatRelativeTime, truncateText } from '@renderer/utils/format'
import styles from './SkillList.module.css'

const { Title, Text } = Typography
const { confirm } = Modal

export function SkillList() {
  const {
    getFilteredSkills,
    selectedSkillId,
    selectSkill,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    isLoading,
    selectedSkillIds,
    toggleSkillSelection,
    clearSelection,
    selectAll,
    selectedCategory,
    selectedTags,
    setCategory,
    toggleTag,
    fetchSkills,
    deleteSkills
  } = useSkillStore()
  const { getSkillSyncStates, toolInfos, syncSkillsToTool } = useSyncStore()
  const { success, error, contextHolder } = useToast()

  const [searchInput, setSearchInput] = useState(searchQuery)
  const [editorOpen, setEditorOpen] = useState(false)
  const [batchSyncLoading, setBatchSyncLoading] = useState(false)

  const debouncedSearch = useDebounce(searchInput, 300)

  useEffect(() => {
    setSearchQuery(debouncedSearch)
  }, [debouncedSearch, setSearchQuery])

  const filteredSkills = useMemo(() => getFilteredSkills(), [getFilteredSkills])
  const allSelected =
    filteredSkills.length > 0 && filteredSkills.every((s) => selectedSkillIds.includes(s.id))
  const someSelected = filteredSkills.some((s) => selectedSkillIds.includes(s.id))
  const hasSelection = selectedSkillIds.length > 0

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      selectAll(filteredSkills.map((s) => s.id))
    } else {
      clearSelection()
    }
  }

  const handleBatchDelete = () => {
    confirm({
      title: '确认删除',
      icon: <DeleteOutlined />,
      content: `确定要删除选中的 ${selectedSkillIds.length} 个技能吗？此操作不可撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteSkills(selectedSkillIds)
          success(`成功删除 ${selectedSkillIds.length} 个技能`)
          clearSelection()
        } catch (err) {
          error('批量删除失败')
        }
      }
    })
  }

  const handleBatchSync = async (toolType: ToolType) => {
    if (selectedSkillIds.length === 0) return
    setBatchSyncLoading(true)
    try {
      await syncSkillsToTool(selectedSkillIds, toolType)
      success(`成功同步 ${selectedSkillIds.length} 个技能`)
    } catch (err) {
      error('批量同步失败')
    } finally {
      setBatchSyncLoading(false)
    }
  }

  const getSyncBadge = (skill: Skill) => {
    const states = getSkillSyncStates(skill.id)
    if (states.length === 0) {
      return (
        <Tooltip title="未同步">
          <Badge status="default" />
        </Tooltip>
      )
    }

    const allSynced = states.every((s) => s.status === SyncStatus.SYNCED)
    const hasModified = states.some((s) => s.status === SyncStatus.MODIFIED)

    if (allSynced) {
      return (
        <Tooltip title="全部已同步">
          <Badge status="success" />
        </Tooltip>
      )
    }
    if (hasModified) {
      return (
        <Tooltip title="有修改未同步">
          <Badge status="warning" />
        </Tooltip>
      )
    }
    return (
      <Tooltip title="部分未同步">
        <Badge status="processing" />
      </Tooltip>
    )
  }

  const getSyncIcon = (skill: Skill) => {
    const states = getSkillSyncStates(skill.id)
    if (states.length === 0) return <SyncOutlined style={{ color: '#bfbfbf' }} />

    const allSynced = states.every((s) => s.status === SyncStatus.SYNCED)
    const hasModified = states.some((s) => s.status === SyncStatus.MODIFIED)

    if (allSynced) return <CheckOutlined style={{ color: '#52c41a' }} />
    if (hasModified) return <WarningOutlined style={{ color: '#faad14' }} />
    return <SyncOutlined style={{ color: '#1890ff' }} />
  }

  const syncMenuItems = toolInfos
    .filter((tool) => tool.isInstalled)
    .map((tool) => ({
      key: tool.type,
      label: (
        <Space>
          <span>{tool.name}</span>
        </Space>
      ),
      onClick: () => handleBatchSync(tool.type as ToolType)
    }))

  const clearAllFilters = () => {
    setCategory(null)
    selectedTags.forEach((tag) => toggleTag(tag))
    setSearchInput('')
    setSearchQuery('')
  }

  const renderListView = () => (
    <div className={styles.listContainer}>
      {hasSelection && (
        <div className={styles.batchToolbar}>
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onChange={(e) => handleSelectAll(e.target.checked)}
          >
            已选 {selectedSkillIds.length} 项
          </Checkbox>
          <Space>
            <Dropdown menu={{ items: syncMenuItems }} placement="bottomRight">
              <Button icon={<SyncOutlined />} loading={batchSyncLoading} size="small">
                批量同步 <DownOutlined style={{ fontSize: 10 }} />
              </Button>
            </Dropdown>
            <Button icon={<DeleteOutlined />} danger size="small" onClick={handleBatchDelete}>
              批量删除
            </Button>
            <Button type="text" size="small" onClick={clearSelection}>
              取消选择
            </Button>
          </Space>
        </div>
      )}
      <List
        loading={isLoading}
        dataSource={filteredSkills}
        locale={{ emptyText: <Empty description="暂无技能" /> }}
        renderItem={(skill) => (
          <List.Item
            key={skill.id}
            className={`${styles.listItem} ${selectedSkillId === skill.id ? styles.listItemActive : ''}`}
            onClick={() => selectSkill(skill.id)}
          >
            <Checkbox
              className={styles.checkbox}
              checked={selectedSkillIds.includes(skill.id)}
              onClick={(e) => e.stopPropagation()}
              onChange={() => toggleSkillSelection(skill.id)}
            />
            <List.Item.Meta
              avatar={getSyncIcon(skill)}
              title={
                <Space size="small" align="center">
                  <span className={styles.skillName}>{skill.name}</span>
                  {getSyncBadge(skill)}
                </Space>
              }
              description={
                <div className={styles.skillDescription}>
                  <Text type="secondary">{truncateText(skill.description, 60)}</Text>
                  <div className={styles.skillMeta}>
                    <Tag color="blue" style={{ marginRight: 8 }}>
                      {skill.category}
                    </Tag>
                    <div className={styles.tagsInline}>
                      {skill.tags.slice(0, 3).map((tag) => (
                        <Tag key={tag} className={styles.smallTag}>
                          {tag}
                        </Tag>
                      ))}
                      {skill.tags.length > 3 && (
                        <Tag className={styles.smallTag}>+{skill.tags.length - 3}</Tag>
                      )}
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      更新于 {formatRelativeTime(skill.updatedAt)}
                    </Text>
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  )

  const renderCardView = () => {
    if (isLoading) {
      return (
        <div className={styles.loadingContainer}>
          <Spin size="large" />
        </div>
      )
    }

    if (filteredSkills.length === 0) {
      return <Empty description="暂无技能" style={{ padding: 40 }} />
    }

    return (
      <div className={styles.cardGrid}>
        {filteredSkills.map((skill) => (
          <Card
            key={skill.id}
            hoverable
            className={`${styles.card} ${selectedSkillId === skill.id ? styles.cardActive : ''}`}
            onClick={() => selectSkill(skill.id)}
          >
            <div className={styles.cardHeader}>
              <Checkbox
                checked={selectedSkillIds.includes(skill.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleSkillSelection(skill.id)}
              />
              {getSyncBadge(skill)}
            </div>
            <Card.Meta
              title={
                <Space size="small" align="center">
                  <span className={styles.cardTitle}>{skill.name}</span>
                </Space>
              }
              description={
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    {truncateText(skill.description, 80)}
                  </Text>
                  <div style={{ marginBottom: 8 }}>
                    <Tag color="blue">{skill.category}</Tag>
                  </div>
                  <div className={styles.cardTags}>
                    {skill.tags.slice(0, 3).map((tag) => (
                      <Tag key={tag} style={{ margin: '0 4px 4px 0' }}>
                        {tag}
                      </Tag>
                    ))}
                    {skill.tags.length > 3 && (
                      <Tag style={{ margin: '0 4px 4px 0' }}>+{skill.tags.length - 3}</Tag>
                    )}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    更新于 {formatRelativeTime(skill.updatedAt)}
                  </Text>
                </div>
              }
            />
          </Card>
        ))}
      </div>
    )
  }

  const hasFilters = searchQuery || selectedCategory || selectedTags.length > 0

  return (
    <div className={styles.container}>
      {contextHolder}
      <SkillEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSuccess={(skill) => {
          selectSkill(skill.id)
          fetchSkills()
        }}
      />

      <div className={styles.header}>
        <div className={styles.headerTop}>
          <Title level={4} style={{ margin: 0 }}>
            技能列表
          </Title>
          <Space size="small">
            <Text type="secondary">{filteredSkills.length} 个技能</Text>
            <Tooltip title="刷新">
              <Button
                type="text"
                icon={<ReloadOutlined />}
                size="small"
                onClick={() => fetchSkills()}
                loading={isLoading}
              />
            </Tooltip>
          </Space>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div className={styles.toolbar}>
          <Input
            placeholder="搜索技能..."
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            allowClear
            className="skill-search-input"
            style={{ flex: 1, maxWidth: 320 }}
          />
          <Space>
            <Tooltip title="列表视图">
              <Button
                type={viewMode === VIEW_MODES.LIST ? 'primary' : 'default'}
                icon={<UnorderedListOutlined />}
                onClick={() => setViewMode(VIEW_MODES.LIST)}
              />
            </Tooltip>
            <Tooltip title="卡片视图">
              <Button
                type={viewMode === VIEW_MODES.CARD ? 'primary' : 'default'}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode(VIEW_MODES.CARD)}
              />
            </Tooltip>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setEditorOpen(true)}
              className="skill-new-button"
            >
              新建
            </Button>
          </Space>
        </div>

        {hasFilters && (
          <div className={styles.filterTags}>
            <Text type="secondary" style={{ marginRight: 8 }}>
              筛选：
            </Text>
            {searchQuery && (
              <Tag
                closable
                onClose={() => {
                  setSearchInput('')
                  setSearchQuery('')
                }}
                color="blue"
              >
                搜索: {searchQuery}
              </Tag>
            )}
            {selectedCategory && (
              <Tag closable onClose={() => setCategory(null)} color="green">
                分类: {selectedCategory}
              </Tag>
            )}
            {selectedTags.map((tag) => (
              <Tag key={tag} closable onClose={() => toggleTag(tag)} color="orange">
                标签: {tag}
              </Tag>
            ))}
            <Button
              type="link"
              size="small"
              onClick={clearAllFilters}
              icon={<CloseCircleOutlined />}
            >
              清除全部
            </Button>
          </div>
        )}
      </div>

      <div className={styles.content}>
        {viewMode === VIEW_MODES.LIST ? renderListView() : renderCardView()}
      </div>
    </div>
  )
}
