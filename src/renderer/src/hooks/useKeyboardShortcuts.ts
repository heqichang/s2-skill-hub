import { useEffect, useCallback } from 'react'

interface KeyboardShortcutsOptions {
  onNewSkill?: () => void
  onFocusSearch?: () => void
  onSave?: () => void
  onEscape?: () => void
  onOpenSettings?: () => void
  enabled?: boolean
}

export function useKeyboardShortcuts({
  onNewSkill,
  onFocusSearch,
  onSave,
  onEscape,
  onOpenSettings,
  enabled = true
}: KeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modifier = isMac ? event.metaKey : event.ctrlKey

      if (modifier && event.key === 'n') {
        event.preventDefault()
        onNewSkill?.()
      }

      if (modifier && event.key === 'f') {
        event.preventDefault()
        onFocusSearch?.()
      }

      if (modifier && event.key === 's') {
        event.preventDefault()
        onSave?.()
      }

      if (modifier && event.key === ',') {
        event.preventDefault()
        onOpenSettings?.()
      }

      if (event.key === 'Escape') {
        onEscape?.()
      }
    },
    [enabled, onNewSkill, onFocusSearch, onSave, onEscape, onOpenSettings]
  )

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [enabled, handleKeyDown])
}
