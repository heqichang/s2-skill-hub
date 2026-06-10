import { Button, Space, Typography } from 'antd'
import { FolderOpenOutlined, AppstoreOutlined, PlusOutlined } from '@ant-design/icons'
import { useToast } from '@renderer/hooks/useToast'
import { isIpcSuccess } from '@renderer/utils/ipc'
import styles from './EmptyState.module.css'

const { Title, Paragraph } = Typography

interface EmptyStateProps {
  onRepoInitialized?: () => void
}

export function EmptyState({ onRepoInitialized }: EmptyStateProps) {
  const { success, error, contextHolder } = useToast()

  const handleSelectRepo = async () => {
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.config.selectDirectory({
          title: '选择 Skill 仓库目录'
        })
        if (isIpcSuccess(response) && response.data.path) {
          const repoPath = response.data.path
          const initResponse = await window.ipcApi.repo.init({ repoPath })
          if (isIpcSuccess(initResponse)) {
            success('仓库初始化成功')
            if (onRepoInitialized) {
              onRepoInitialized()
            }
          }
        }
      }
    } catch (err) {
      error('初始化仓库失败')
    }
  }

  const handleCreateRepo = async () => {
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.config.selectDirectory({
          title: '选择要创建 Skill 仓库的目录'
        })
        if (isIpcSuccess(response) && response.data.path) {
          const repoPath = response.data.path
          const initResponse = await window.ipcApi.repo.init({ repoPath })
          if (isIpcSuccess(initResponse)) {
            success('仓库创建成功')
            if (onRepoInitialized) {
              onRepoInitialized()
            }
          }
        }
      }
    } catch (err) {
      error('创建仓库失败')
    }
  }

  return (
    <div className={styles.container}>
      {contextHolder}
      <div className={styles.content}>
        <div className={styles.illustration}>
          <div className={styles.iconWrapper}>
            <AppstoreOutlined style={{ fontSize: 72, color: '#1890ff' }} />
          </div>
        </div>

        <Title level={3} style={{ marginBottom: 12 }}>
          欢迎使用 Skill Hub
        </Title>

        <Paragraph type="secondary" style={{ fontSize: 15, marginBottom: 32 }}>
          开始之前，你需要先设置一个 Skill 仓库
        </Paragraph>

        <Space direction="vertical" size="middle" style={{ width: '100%', maxWidth: 320 }}>
          <Button
            type="primary"
            size="large"
            icon={<FolderOpenOutlined />}
            onClick={handleSelectRepo}
            block
          >
            选择已有仓库
          </Button>

          <Button size="large" icon={<PlusOutlined />} onClick={handleCreateRepo} block>
            创建新仓库
          </Button>
        </Space>

        <div className={styles.tip}>
          <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
            💡 Skill 仓库是一个文件夹，用于存储你所有的 Skills
          </Paragraph>
        </div>
      </div>
    </div>
  )
}
