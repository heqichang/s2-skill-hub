import type { IpcResponse } from '@shared/types/ipc'

export function success<T>(data: T): IpcResponse<T> {
  return {
    success: true,
    data
  }
}

export function error(message: string, code?: string): IpcResponse<never> {
  console.error(`[IPC Error] ${code ? `[${code}] ` : ''}${message}`)
  return {
    success: false,
    error: {
      message,
      code
    }
  }
}

export function handleError(err: unknown, defaultCode = 'UNKNOWN_ERROR'): IpcResponse<never> {
  if (err instanceof Error) {
    return error(err.message, defaultCode)
  }
  return error(String(err), defaultCode)
}
