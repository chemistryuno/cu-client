export type ClientRuntimeHost = 'browser' | 'electron' | 'capacitor'

export interface ClientStorageAdapter {
  readonly host: ClientRuntimeHost
  readonly length: number
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  key(index: number): string | null
}

export const CLIENT_RUNTIME_STORAGE_KEYS = {
  state: 'chemistry-uno-offline-state-v2',
  user: 'user',
  token: 'token',
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  theme: 'theme',
} as const

const resolveClientRuntimeHost = (): ClientRuntimeHost => {
  const win = window as Window & typeof globalThis & {
    Capacitor?: { isNativePlatform?: () => boolean }
    process?: { versions?: { electron?: string } }
  }

  if (typeof win.Capacitor?.isNativePlatform === 'function' && win.Capacitor.isNativePlatform()) {
    return 'capacitor'
  }

  if (win.process?.versions?.electron || navigator.userAgent.includes('Electron')) {
    return 'electron'
  }

  return 'browser'
}

class BrowserStorageAdapter implements ClientStorageAdapter {
  readonly host: ClientRuntimeHost

  constructor(host: ClientRuntimeHost) {
    this.host = host
  }

  get length() {
    return window.localStorage.length
  }

  getItem(key: string) {
    return window.localStorage.getItem(key)
  }

  setItem(key: string, value: string) {
    window.localStorage.setItem(key, value)
  }

  removeItem(key: string) {
    window.localStorage.removeItem(key)
  }

  key(index: number) {
    return window.localStorage.key(index)
  }
}

export const clientRuntimeStorage: ClientStorageAdapter = new BrowserStorageAdapter(resolveClientRuntimeHost())

export const getClientRuntimeHost = () => clientRuntimeStorage.host

export const removeClientRuntimeKeys = (keys: readonly string[]) => {
  keys.forEach((key) => clientRuntimeStorage.removeItem(key))
}

export const exportClientRuntimeEntries = () => {
  const entries: Record<string, string> = {}
  for (let index = 0; index < clientRuntimeStorage.length; index += 1) {
    const key = clientRuntimeStorage.key(index)
    if (!key) continue
    const value = clientRuntimeStorage.getItem(key)
    if (value !== null) {
      entries[key] = value
    }
  }
  return entries
}
