import { useCallback, useState } from 'react'
import type { IpcResponse } from '@shared/types/ipc'
import { isIpcSuccess } from '@renderer/utils/ipc'

interface IpcCallOptions {
  showLoading?: boolean
  showError?: boolean
}

export function useIpc() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const call = useCallback(
    async <T>(
      ipcFn: () => Promise<IpcResponse<T>>,
      options: IpcCallOptions = {}
    ): Promise<T | null> => {
      const { showLoading = true, showError = true } = options

      if (showLoading) {
        setIsLoading(true)
      }
      setError(null)

      try {
        const response = await ipcFn()
        if (isIpcSuccess(response)) {
          return response.data
        }
        const errorMessage = response.error.message
        if (showError) {
          setError(errorMessage)
        }
        return null
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '未知错误'
        if (showError) {
          setError(errorMessage)
        }
        return null
      } finally {
        if (showLoading) {
          setIsLoading(false)
        }
      }
    },
    []
  )

  const callWithToast = useCallback(
    async <T>(
      ipcFn: () => Promise<IpcResponse<T>>,
      toast: {
        success: (msg: string) => void
        error: (msg: string) => void
        loading: () => { (): void; then: undefined }
      },
      successMessage?: string,
      options: IpcCallOptions = {}
    ): Promise<T | null> => {
      const hideLoading = toast.loading()
      try {
        const response = await ipcFn()
        hideLoading()
        if (isIpcSuccess(response)) {
          if (successMessage) {
            toast.success(successMessage)
          }
          return response.data
        }
        toast.error(response.error.message)
        return null
      } catch (err) {
        hideLoading()
        const errorMessage = err instanceof Error ? err.message : '未知错误'
        if (options.showError !== false) {
          toast.error(errorMessage)
        }
        return null
      }
    },
    []
  )

  return {
    call,
    callWithToast,
    isLoading,
    error
  }
}
