import { useState, useEffect } from 'react'
import { ConfigProvider, theme as antdTheme, Spin } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useAppStore } from '@renderer/store/useAppStore'
import { useSkillStore } from '@renderer/store/useSkillStore'
import { MainLayout } from '@renderer/components/MainLayout'
import { Onboarding } from '@renderer/components/Onboarding'
import { EmptyState } from '@renderer/components/EmptyState'
import { THEME_MODES } from '@renderer/utils/constants'
import { isIpcSuccess } from '@renderer/utils/ipc'
import '@renderer/styles/global.css'

function App() {
  const { theme } = useAppStore()
  const { isRepoInitialized, checkRepoInitialized, fetchSkills, fetchCategories } = useSkillStore()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkFirstLaunch()
  }, [])

  const checkFirstLaunch = async () => {
    setLoading(true)
    try {
      if (typeof window !== 'undefined' && window.ipcApi) {
        const response = await window.ipcApi.config.getRepoPath()
        if (isIpcSuccess(response)) {
          const repoPath = response.data.repoPath
          if (!repoPath) {
            setShowOnboarding(true)
          } else {
            await checkRepoInitialized()
          }
        }
      } else {
        await checkRepoInitialized()
      }
    } catch (err) {
      console.error('检查首次启动失败:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false)
    await checkRepoInitialized()
    await fetchSkills()
    await fetchCategories()
  }

  const handleOnboardingSkip = async () => {
    setShowOnboarding(false)
    await checkRepoInitialized()
  }

  const handleRepoInitialized = async () => {
    await checkRepoInitialized()
    await fetchSkills()
    await fetchCategories()
  }

  const algorithm =
    theme === THEME_MODES.DARK ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm

  if (loading) {
    return (
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm,
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6
          }
        }}
      >
        <div
          className={theme === THEME_MODES.DARK ? 'dark' : ''}
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: theme === THEME_MODES.DARK ? '#141414' : '#f5f5f5'
          }}
        >
          <Spin size="large" tip="加载中..." />
        </div>
      </ConfigProvider>
    )
  }

  if (showOnboarding) {
    return (
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm,
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6
          }
        }}
      >
        <div className={theme === THEME_MODES.DARK ? 'dark' : ''} style={{ height: '100%' }}>
          <Onboarding onComplete={handleOnboardingComplete} onSkip={handleOnboardingSkip} />
        </div>
      </ConfigProvider>
    )
  }

  if (!isRepoInitialized) {
    return (
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm,
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 6
          }
        }}
      >
        <div className={theme === THEME_MODES.DARK ? 'dark' : ''} style={{ height: '100%' }}>
          <EmptyState onRepoInitialized={handleRepoInitialized} />
        </div>
      </ConfigProvider>
    )
  }

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6
        }
      }}
    >
      <div className={theme === THEME_MODES.DARK ? 'dark' : ''} style={{ height: '100%' }}>
        <MainLayout />
      </div>
    </ConfigProvider>
  )
}

export default App
