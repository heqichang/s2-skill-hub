import { describe, it, expect } from 'vitest'
import { success, error, handleError } from './utils'
import type { IpcResponse } from '@shared/types/ipc'

describe('IPC Utils', () => {
  describe('success', () => {
    it('返回成功响应格式', () => {
      const data = { message: 'hello' }
      const result = success(data)

      expect(result.success).toBe(true)
      expect((result as any).data).toEqual(data)
      expect((result as any).error).toBeUndefined()
    })

    it('支持 undefined 数据', () => {
      const result = success(undefined as unknown as void)

      expect(result.success).toBe(true)
      expect((result as any).data).toBeUndefined()
    })

    it('支持 null 数据', () => {
      const result = success(null)

      expect(result.success).toBe(true)
      expect((result as any).data).toBeNull()
    })

    it('支持数字数据', () => {
      const result = success(42)

      expect(result.success).toBe(true)
      expect((result as any).data).toBe(42)
    })

    it('支持字符串数据', () => {
      const result = success('test string')

      expect(result.success).toBe(true)
      expect((result as any).data).toBe('test string')
    })

    it('支持数组数据', () => {
      const data = [1, 2, 3]
      const result = success(data)

      expect(result.success).toBe(true)
      expect((result as any).data).toEqual([1, 2, 3])
    })

    it('支持复杂对象数据', () => {
      const data = {
        id: '123',
        name: 'test',
        nested: {
          value: true
        },
        list: ['a', 'b']
      }
      const result = success(data)

      expect(result.success).toBe(true)
      expect((result as any).data).toEqual(data)
    })
  })

  describe('error', () => {
    it('返回错误响应格式', () => {
      const result = error('Something went wrong')

      expect(result.success).toBe(false)
      expect((result as any).error).toBeDefined()
      expect((result as any).error.message).toBe('Something went wrong')
      expect((result as any).error.code).toBeUndefined()
      expect((result as any).data).toBeUndefined()
    })

    it('支持错误代码', () => {
      const result = error('Something went wrong', 'TEST_ERROR')

      expect(result.success).toBe(false)
      expect((result as any).error.message).toBe('Something went wrong')
      expect((result as any).error.code).toBe('TEST_ERROR')
    })

    it('错误消息可以是空字符串', () => {
      const result = error('')

      expect(result.success).toBe(false)
      expect((result as any).error.message).toBe('')
    })
  })

  describe('handleError', () => {
    it('处理 Error 对象', () => {
      const err = new Error('Test error message')
      const result = handleError(err, 'CUSTOM_CODE')

      expect(result.success).toBe(false)
      expect((result as any).error.message).toBe('Test error message')
      expect((result as any).error.code).toBe('CUSTOM_CODE')
    })

    it('使用默认错误代码', () => {
      const err = new Error('Test error')
      const result = handleError(err)

      expect(result.success).toBe(false)
      expect((result as any).error.code).toBe('UNKNOWN_ERROR')
    })

    it('处理字符串错误', () => {
      const result = handleError('String error message')

      expect(result.success).toBe(false)
      expect((result as any).error.message).toBe('String error message')
      expect((result as any).error.code).toBe('UNKNOWN_ERROR')
    })

    it('处理数字错误', () => {
      const result = handleError(123)

      expect(result.success).toBe(false)
      expect((result as any).error.message).toBe('123')
    })

    it('处理 null 错误', () => {
      const result = handleError(null)

      expect(result.success).toBe(false)
      expect((result as any).error.message).toBe('null')
    })

    it('处理 undefined 错误', () => {
      const result = handleError(undefined)

      expect(result.success).toBe(false)
      expect((result as any).error.message).toBe('undefined')
    })

    it('处理对象错误', () => {
      const err = { message: 'Custom error object' }
      const result = handleError(err)

      expect(result.success).toBe(false)
    })
  })

  describe('响应格式验证', () => {
    it('成功响应具有正确的 TypeScript 类型', () => {
      const response: IpcResponse<string> = success('test')

      if (response.success) {
        expect(response.data).toBe('test')
      } else {
        throw new Error('Expected success response')
      }
    })

    it('错误响应具有正确的 TypeScript 类型', () => {
      const response: IpcResponse<string> = error('test error')

      if (!response.success) {
        expect(response.error.message).toBe('test error')
      } else {
        throw new Error('Expected error response')
      }
    })

    it('成功响应不包含 error 字段', () => {
      const result = success({ value: 1 })
      const keys = Object.keys(result)

      expect(keys).toContain('success')
      expect(keys).toContain('data')
      expect(keys).not.toContain('error')
    })

    it('错误响应不包含 data 字段', () => {
      const result = error('test')
      const keys = Object.keys(result)

      expect(keys).toContain('success')
      expect(keys).toContain('error')
    })
  })
})
