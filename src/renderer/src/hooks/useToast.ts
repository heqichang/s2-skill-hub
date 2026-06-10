import { message } from 'antd'
import { useCallback } from 'react'

export function useToast() {
  const [messageApi, contextHolder] = message.useMessage()

  const success = useCallback(
    (content: string, duration: number = 3) => {
      messageApi.success(content, duration)
    },
    [messageApi]
  )

  const error = useCallback(
    (content: string, duration: number = 3) => {
      messageApi.error(content, duration)
    },
    [messageApi]
  )

  const warning = useCallback(
    (content: string, duration: number = 3) => {
      messageApi.warning(content, duration)
    },
    [messageApi]
  )

  const info = useCallback(
    (content: string, duration: number = 3) => {
      messageApi.info(content, duration)
    },
    [messageApi]
  )

  const loading = useCallback(
    (content: string = '加载中...') => {
      return messageApi.loading(content, 0)
    },
    [messageApi]
  )

  return {
    success,
    error,
    warning,
    info,
    loading,
    contextHolder
  }
}
