export const API_BASE_URL = '/api'
export const OFFLINE_MODE = true

export const buildApiURL = (path: string): string => {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}
