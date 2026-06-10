export const APP_NAME = 'Skill Hub'
export const APP_VERSION = '0.1.0'

export const VIEW_MODES = {
  LIST: 'list',
  CARD: 'card'
} as const

export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES]

export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark'
} as const

export type ThemeMode = (typeof THEME_MODES)[keyof typeof THEME_MODES]
