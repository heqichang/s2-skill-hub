import { useState, useEffect } from 'react'
import { Modal, Form, Input, Select, Tag, Space } from 'antd'
import MDEditor from '@uiw/react-md-editor'
import { PlusOutlined, EditOutlined } from '@ant-design/icons'
import type { Skill } from '@shared/types/skill'
import { useSkillStore } from '@renderer/store/useSkillStore'
import { useToast } from '@renderer/hooks/useToast'
import styles from './SkillEditor.module.css'
import '@uiw/react-md-editor/markdown-editor.css'

const { TextArea } = Input
const { Option } = Select

interface SkillEditorProps {
  open: boolean
  skill?: Skill | null
  onClose: () => void
  onSuccess?: (skill: Skill) => void
}

interface SkillFormValues {
  name: string
  description: string
  category: string
  tags: string[]
}

export function SkillEditor({ open, skill, onClose, onSuccess }: SkillEditorProps) {
  const { categories, createSkill, updateSkill } = useSkillStore()
  const { success, error, contextHolder } = useToast()
  const [form] = Form.useForm<SkillFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const [content, setContent] = useState('')
  const isEdit = !!skill

  useEffect(() => {
    if (open) {
      if (skill) {
        form.setFieldsValue({
          name: skill.name,
          description: skill.description,
          category: skill.category,
          tags: skill.tags
        })
        setContent(skill.content)
      } else {
        form.resetFields()
        setContent('')
      }
    }
  }, [open, skill, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      const skillData = {
        ...values,
        content
      }

      if (isEdit && skill) {
        const updatedSkill = await updateSkill(skill.id, skillData)
        success('更新成功')
        onSuccess?.(updatedSkill)
      } else {
        const newSkill = await createSkill(skillData)
        success('创建成功')
        onSuccess?.(newSkill)
      }

      onClose()
    } catch (err) {
      if (err instanceof Error && err.name !== 'ValidateError') {
        error(isEdit ? '更新失败' : '创建失败')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const tagRender = (props: {
    label: React.ReactNode
    value: string
    closable: boolean
    onClose: () => void
  }) => {
    // eslint-disable-next-line react/prop-types
    const { label, closable, onClose } = props
    return (
      <Tag color="blue" closable={closable} onClose={onClose} style={{ marginRight: 3 }}>
        {label}
      </Tag>
    )
  }

  return (
    <Modal
      title={
        <Space>
          {isEdit ? <EditOutlined /> : <PlusOutlined />}
          {isEdit ? '编辑技能' : '新建技能'}
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      width={800}
      destroyOnClose
      okText={isEdit ? '保存' : '创建'}
      cancelText="取消"
      className={styles.modal}
    >
      {contextHolder}
      <Form form={form} layout="vertical" className={styles.form}>
        <Form.Item
          label="技能名称"
          name="name"
          rules={[{ required: true, message: '请输入技能名称' }]}
        >
          <Input placeholder="请输入技能名称" maxLength={100} showCount />
        </Form.Item>

        <Form.Item label="描述" name="description">
          <TextArea rows={2} placeholder="请输入技能描述" maxLength={200} showCount />
        </Form.Item>

        <Space size="middle" style={{ width: '100%' }}>
          <Form.Item
            label="分类"
            name="category"
            rules={[{ required: true, message: '请选择分类' }]}
            style={{ flex: 1, marginBottom: 0 }}
          >
            <Select placeholder="选择分类">
              {categories.map((cat) => (
                <Option key={cat.id} value={cat.name}>
                  <Space size="small">
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: cat.color || '#1890ff'
                      }}
                    />
                    {cat.name}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="标签" name="tags" style={{ flex: 1, marginBottom: 0 }}>
            <Select
              mode="tags"
              placeholder="输入标签后回车"
              tagRender={tagRender}
              tokenSeparators={[',', ' ']}
            />
          </Form.Item>
        </Space>

        <div className={styles.contentSection}>
          <div className={styles.contentLabel}>内容</div>
          <div data-color-mode="light">
            <MDEditor
              value={content}
              onChange={(val) => setContent(val || '')}
              height={320}
              preview="live"
            />
          </div>
        </div>
      </Form>
    </Modal>
  )
}

interface SkillEditorTriggerProps {
  skill?: Skill | null
  onSuccess?: (skill: Skill) => void
  trigger?: React.ReactNode
}

export function SkillEditorTrigger({ skill, onSuccess, trigger }: SkillEditorTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <SkillEditor
        open={open}
        skill={skill || null}
        onClose={() => setOpen(false)}
        onSuccess={onSuccess}
      />
    </>
  )
}
