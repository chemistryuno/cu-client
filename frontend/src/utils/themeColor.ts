export const THEME_COLOR_STORAGE_KEY = 'theme-color'

export const THEME_COLOR_OPTIONS = [
  { id: 'blue', name: 'BLUE / DEFAULT', swatch: '#3b82f6' },
  { id: 'cyan', name: 'CYAN / SIGNAL', swatch: '#06b6d4' },
  { id: 'green', name: 'GREEN / REACTOR', swatch: '#84cc16' },
  { id: 'violet', name: 'VIOLET / ARCANE', swatch: '#8b5cf6' },
  { id: 'orange', name: 'ORANGE / WARNING', swatch: '#f97316' },
  { id: 'rose', name: 'ROSE / IMPACT', swatch: '#f43f5e' },
] as const

export type ThemeColor = typeof THEME_COLOR_OPTIONS[number]['id']

export const DEFAULT_THEME_COLOR: ThemeColor = 'blue'

const isThemeColor = (value: string | null): value is ThemeColor =>
  THEME_COLOR_OPTIONS.some((option) => option.id === value)

export const normalizeThemeColor = (value: string | null): ThemeColor =>
  isThemeColor(value) ? value : DEFAULT_THEME_COLOR

export const getStoredThemeColor = (): ThemeColor =>
  normalizeThemeColor(localStorage.getItem(THEME_COLOR_STORAGE_KEY))

export const applyThemeColor = (color: ThemeColor = getStoredThemeColor()) => {
  const normalized = normalizeThemeColor(color)
  document.documentElement.dataset.themeColor = normalized
  return normalized
}

export const setStoredThemeColor = (color: ThemeColor) => {
  const normalized = normalizeThemeColor(color)
  localStorage.setItem(THEME_COLOR_STORAGE_KEY, normalized)
  applyThemeColor(normalized)
  window.dispatchEvent(new CustomEvent('theme-changed'))
}
