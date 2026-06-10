import { useEffect, useState, useCallback } from 'react'
import { Layout, Drawer, Space } from 'antd'
import { SettingOutlined, BulbOutlined } from '@ant-design/icons'
import { Sidebar } from '@renderer/components/Sidebar'
import { SkillList } from '@renderer/components/SkillList'
import { SkillDetail } from '@renderer/components/SkillDetail'
import { GitPanel } from '@renderer/components/GitPanel'
import { SettingsPanel } from '@renderer/components/SettingsPanel'
import { useSkillStore } from '@renderer/store/useSkillStore'
import { useSyncStore } from '@renderer/store/useSyncStore'
import { useGitStore } from '@renderer/store/useGitStore'
import { useToast } from '@renderer/hooks/useToast'
import { useKeyboardShortcuts } from '@renderer/hooks/useKeyboardShortcuts'
import styles from './MainLayout.module.css'

const { Content } = Layout

export function MainLayout() {
  const { fetchSkills, fetchCategories, checkRepoInitialized } = useSkillStore()
  const { fetchToolInfos, fetchAllSyncStates } = useSyncStore()
  const { fetchStatus, fetchHistory } = useGitStore()
  const { contextHolder } = useToast()

  const [settingsVisible, setSettingsVisible] = useState(false)
  const [gitVisible, setGitVisible] = useState(false)

  useEffect(() => {
    checkRepoInitialized()
    fetchSkills()
    fetchCategories()
    fetchToolInfos()
    fetchAllSyncStates()
    fetchStatus()
    fetchHistory()
  }, [
    checkRepoInitialized,
    fetchSkills,
    fetchCategories,
    fetchToolInfos,
    fetchAllSyncStates,
    fetchStatus,
    fetchHistory
  ])

  const handleOpenSettings = useCallback(() => {
    setSettingsVisible(true)
  }, [])

  const handleCloseSettings = useCallback(() => {
    setSettingsVisible(false)
  }, [])

  const handleOpenGit = useCallback(() => {
    setGitVisible(true)
  }, [])

  const handleCloseGit = useCallback(() => {
    setGitVisible(false)
  }, [])

  const handleFocusSearch = useCallback(() => {
    const searchInput = document.querySelector('.skill-search-input input') as HTMLInputElement
    if (searchInput) {
      searchInput.focus()
      searchInput.select()
    }
  }, [])

  const handleNewSkill = useCallback(() => {
    const newButton = document.querySelector('.skill-new-button') as HTMLButtonElement
    if (newButton) {
      newButton.click()
    }
  }, [])

  const handleEscape = useCallback(() => {
    if (settingsVisible) {
      setSettingsVisible(false)
    } else if (gitVisible) {
      setGitVisible(false)
    }
  }, [settingsVisible, gitVisible])

  useKeyboardShortcuts({
    onNewSkill: handleNewSkill,
    onFocusSearch: handleFocusSearch,
    onOpenSettings: handleOpenSettings,
    onEscape: handleEscape,
    enabled: true
  })

  return (
    <Layout className={styles.layout}>
      {contextHolder}

      <Sidebar onOpenSettings={handleOpenSettings} onOpenGit={handleOpenGit} />

      <Layout className={styles.mainContent}>
        <Content className={styles.content}>
          <div className={styles.skillListContainer}>
            <SkillList />
          </div>
          <div className={styles.skillDetailContainer}>
            <SkillDetail />
          </div>
        </Content>
      </Layout>

      <Drawer
        title={
          <Space>
            <SettingOutlined />
            设置
          </Space>
        }
        placement="right"
        width={480}
        open={settingsVisible}
        onClose={handleCloseSettings}
        destroyOnClose
        styles={{ body: { padding: 0 } }}
      >
        <SettingsPanel onClose={handleCloseSettings} />
      </Drawer>

      <Drawer
        title={
          <Space>
            <BulbOutlined />
            Git 版本管理
          </Space>
        }
        placement="right"
        width={520}
        open={gitVisible}
        onClose={handleCloseGit}
        destroyOnClose
      >
        <GitPanel />
      </Drawer>
    </Layout>
  )
}
