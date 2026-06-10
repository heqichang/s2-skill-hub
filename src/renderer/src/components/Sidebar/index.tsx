import { useState, useMemo } from 'react'
import {
  Layout,
  Menu,
  Tag,
  Button,
  Divider,
  Typography,
  Space,
  Modal,
  Form,
  Input,
  List,
  Input as AntInput
} from 'antd'
import {
  AppstoreOutlined,
  SettingOutlined,
  FolderOutlined,
  TagsOutlined,
  BulbOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
  MoreOutlined,
  CheckOutlined
} from '@ant-design/icons'
import { useSkillStore } from '@renderer/store/useSkillStore'
import { useAppStore } from '@renderer/store/useAppStore'
import { useToast } from '@renderer/hooks/useToast'
import { APP_VERSION } from '@renderer/utils/constants'
import type { Category } from '@shared/types/skill'
import styles from './Sidebar.module.css'

const { Sider } = Layout
const { Title, Text } = Typography
const { confirm } = Modal
const { Search } = AntInput

interface SidebarProps {
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
  onOpenSettings?: () => void
  onOpenGit?: () => void
}

interface CategoryFormValues {
  name: string
  color: string
}

const PRESET_COLORS = [
  '#1890ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#fa8c16'
]

export function Sidebar({ onOpenSettings, onOpenGit }: SidebarProps) {
  const {
    categories,
    selectedCategory,
    setCategory,
    getAllTags,
    selectedTags,
    toggleTag,
    getCategoryCount,
    getTagCount,
    skills,
    createCategory,
    updateCategory,
    deleteCategory
  } = useSkillStore()
  const { theme } = useAppStore()
  const { success, error, contextHolder } = useToast()

  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryForm] = Form.useForm<CategoryFormValues>()
  const [tagSearchQuery, setTagSearchQuery] = useState('')
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false)

  const allTags = getAllTags()

  const filteredTags = useMemo(() => {
    if (!tagSearchQuery) return allTags
    const query = tagSearchQuery.toLowerCase()
    return allTags.filter((tag) => tag.toLowerCase().includes(query))
  }, [allTags, tagSearchQuery])

  const handleCategoryClick = (categoryName: string | null) => {
    setCategory(categoryName)
  }

  const handleAddCategory = () => {
    setEditingCategory(null)
    categoryForm.resetFields()
    categoryForm.setFieldsValue({ color: '#1890ff' })
    setCategoryModalOpen(true)
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    categoryForm.setFieldsValue({
      name: category.name,
      color: category.color || '#1890ff'
    })
    setCategoryModalOpen(true)
  }

  const handleDeleteCategory = (category: Category) => {
    confirm({
      title: '确认删除分类',
      icon: <DeleteOutlined />,
      content: `确定要删除分类「${category.name}」吗？该分类下的技能不会被删除。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteCategory(category.id)
          success('删除成功')
        } catch (err) {
          error('删除失败')
        }
      }
    })
  }

  const handleCategorySubmit = async () => {
    try {
      const values = await categoryForm.validateFields()
      if (editingCategory) {
        await updateCategory(editingCategory.id, values)
        success('更新成功')
      } else {
        await createCategory(values)
        success('创建成功')
      }
      setCategoryModalOpen(false)
    } catch (err) {
      // validation error, ignore
    }
  }

  const categoryMenuItems = [
    {
      key: 'all',
      icon: <AppstoreOutlined />,
      label: (
        <span className={styles.menuItemLabel}>
          <span>全部技能</span>
          <Tag color="default" className={styles.countBadge}>
            {skills.length}
          </Tag>
        </span>
      ),
      onClick: () => handleCategoryClick(null)
    }
  ]

  const categoryItems = categories.map((cat) => ({
    key: `cat-${cat.id}`,
    icon: (
      <span className={styles.categoryDot} style={{ backgroundColor: cat.color || '#1890ff' }} />
    ),
    label: (
      <div className={styles.menuItemLabel}>
        <span>{cat.name}</span>
        <Tag color="default" className={styles.countBadge}>
          {getCategoryCount(cat.name)}
        </Tag>
      </div>
    ),
    onClick: () => handleCategoryClick(cat.name)
  }))

  const menuItems = [
    ...categoryMenuItems,
    {
      key: 'categories',
      icon: <FolderOutlined />,
      label: (
        <div className={styles.menuGroupHeader}>
          <span>分类</span>
          <Space size={2}>
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                handleAddCategory()
              }}
              className={styles.addButton}
            />
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                setManageCategoriesOpen(true)
              }}
              className={styles.addButton}
            />
          </Space>
        </div>
      ),
      children: categoryItems,
      type: 'group' as const
    },
    {
      key: 'git',
      icon: <BulbOutlined />,
      label: 'Git 版本',
      onClick: onOpenGit
    }
  ]

  const selectedKeys = selectedCategory
    ? [`cat-${categories.find((c) => c.name === selectedCategory)?.id}`]
    : ['all']

  const renderCategoryManager = () => (
    <div className={styles.categoryManager}>
      <div className={styles.categoryManagerHeader}>
        <Text strong>分类管理</Text>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddCategory}>
          新建
        </Button>
      </div>
      <List
        size="small"
        dataSource={categories}
        locale={{ emptyText: '暂无分类' }}
        className={styles.categoryList}
        renderItem={(cat) => (
          <List.Item
            actions={[
              <Button
                key="edit"
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  handleEditCategory(cat)
                  setManageCategoriesOpen(false)
                }}
              />,
              <Button
                key="delete"
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteCategory(cat)}
              />
            ]}
          >
            <List.Item.Meta
              avatar={
                <span
                  className={styles.categoryDotLarge}
                  style={{ backgroundColor: cat.color || '#1890ff' }}
                />
              }
              title={cat.name}
              description={`${getCategoryCount(cat.name)} 个技能`}
            />
          </List.Item>
        )}
      />
    </div>
  )

  return (
    <Sider
      width={260}
      theme={theme}
      className={styles.sidebar}
      style={{ borderRight: '1px solid rgba(0,0,0,0.06)' }}
    >
      {contextHolder}

      <Modal
        title={editingCategory ? '编辑分类' : '新建分类'}
        open={categoryModalOpen}
        onOk={handleCategorySubmit}
        onCancel={() => setCategoryModalOpen(false)}
        okText={editingCategory ? '保存' : '创建'}
        cancelText="取消"
        destroyOnClose
        width={400}
      >
        <Form form={categoryForm} layout="vertical">
          <Form.Item
            label="分类名称"
            name="name"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="请输入分类名称" maxLength={20} />
          </Form.Item>
          <Form.Item label="颜色" name="color">
            <div className={styles.colorPicker}>
              <div className={styles.colorPresets}>
                {PRESET_COLORS.map((color) => (
                  <div
                    key={color}
                    className={styles.colorOption}
                    style={{ backgroundColor: color }}
                    onClick={() => categoryForm.setFieldsValue({ color })}
                  >
                    {categoryForm.getFieldValue('color') === color && (
                      <CheckOutlined style={{ color: '#fff', fontSize: 12 }} />
                    )}
                  </div>
                ))}
              </div>
              <Input type="color" className={styles.customColorInput} />
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="分类管理"
        open={manageCategoriesOpen}
        onCancel={() => setManageCategoriesOpen(false)}
        footer={null}
        width={420}
        destroyOnClose
      >
        {renderCategoryManager()}
      </Modal>

      <div className={styles.logoSection}>
        <div className={styles.logoIcon}>
          <AppstoreOutlined style={{ fontSize: 24, color: '#fff' }} />
        </div>
        <div>
          <Title level={5} style={{ margin: 0, color: theme === 'dark' ? '#fff' : '#000' }}>
            Skill Hub
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            技能管理中心
          </Text>
        </div>
      </div>

      <Menu
        mode="inline"
        theme={theme}
        selectedKeys={selectedKeys}
        items={menuItems}
        className={styles.menu}
      />

      <div className={styles.tagsSection}>
        <div className={styles.sectionHeader}>
          <TagsOutlined style={{ marginRight: 8 }} />
          <span>标签</span>
          <Tag color="blue" className={styles.countBadge}>
            {allTags.length}
          </Tag>
        </div>

        <Search
          placeholder="搜索标签..."
          size="small"
          allowClear
          value={tagSearchQuery}
          onChange={(e) => setTagSearchQuery(e.target.value)}
          className={styles.tagSearch}
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        />

        <div className={styles.tagCloud}>
          {filteredTags.length > 0 ? (
            filteredTags.map((tag) => (
              <Tag
                key={tag}
                color={selectedTags.includes(tag) ? 'blue' : 'default'}
                className={`${styles.tag} ${selectedTags.includes(tag) ? styles.tagActive : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
                <span className={styles.tagCount}>{getTagCount(tag)}</span>
              </Tag>
            ))
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tagSearchQuery ? '没有匹配的标签' : '暂无标签'}
            </Text>
          )}
        </div>

        {selectedTags.length > 0 && (
          <div className={styles.selectedTags}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              已选 {selectedTags.length} 个标签
            </Text>
            <Button
              type="link"
              size="small"
              onClick={() => {
                selectedTags.forEach((tag) => toggleTag(tag))
              }}
            >
              清除全部
            </Button>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <Divider style={{ margin: '12px 0' }} />
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Button
            icon={<SettingOutlined />}
            block
            type="text"
            onClick={onOpenSettings}
            style={{ justifyContent: 'flex-start' }}
          >
            设置
          </Button>
          <Text type="secondary" style={{ fontSize: 11, textAlign: 'center' }}>
            v{APP_VERSION}
          </Text>
        </Space>
      </div>
    </Sider>
  )
}
