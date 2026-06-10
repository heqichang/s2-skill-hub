import type { IpcResponse, IpcErrorResponse } from '@shared/types/ipc'

export function isIpcSuccess<T>(response: IpcResponse<T>): response is { success: true; data: T } {
  return response.success === true
}

export function isIpcError(response: IpcResponse<unknown>): response is IpcErrorResponse {
  return response.success === false
}

export async function handleIpcCall<T>(ipcFn: () => Promise<IpcResponse<T>>): Promise<T> {
  const response = await ipcFn()
  if (isIpcSuccess(response)) {
    return response.data
  }
  throw new Error(response.error.message)
}

export function createMockResponse<T>(data: T, delay: number = 300): Promise<IpcResponse<T>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, data })
    }, delay)
  })
}
