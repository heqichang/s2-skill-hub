import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export function formatDate(timestamp: number, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs(timestamp).format(format)
}

export function formatRelativeTime(timestamp: number): string {
  return dayjs(timestamp).fromNow()
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
