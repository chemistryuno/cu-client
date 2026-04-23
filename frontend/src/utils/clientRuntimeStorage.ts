export type ClientRuntimeHost = 'browser' | 'electron' | 'capacitor'

export interface ClientStorageAdapter {
  readonly host: ClientRuntimeHost
  readonly length: number
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  key(index: number): string | null
}

export interface ClientStorageBridge {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  keys?(): string[]
}

export const CLIENT_RUNTIME_STORAGE_KEYS = {
  state: 'chemistry-uno-offline-state-v2',
  sessions: 'chemistry-uno-offline-sessions-v1',
  announcements: 'chemistry-uno-offline-announcements-v1',
  reactions: 'chemistry-uno-offline-reactions-v1',
  substances: 'chemistry-uno-offline-substances-v1',
  configs: 'chemistry-uno-offline-configs-v1',
  leaderboard: 'chemistry-uno-offline-leaderboard-v1',
  currentSessionId: 'chemistry-uno-current-session-id',
  user: 'user',
  token: 'token',
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  theme: 'theme',
} as const

const DEFAULT_HOST_NAMESPACES: Record<ClientRuntimeHost, string> = {
  browser: '',
  electron: 'chemistry-uno-electron-runtime',
  capacitor: 'chemistry-uno-capacitor-runtime',
}

const resolveClientRuntimeHost = (): ClientRuntimeHost => {
  if (typeof window === 'undefined') {
    return 'browser'
  }

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

const toNamespacedKey = (namespace: string, key: string) => (namespace ? `${namespace}:${key}` : key)

const fromNamespacedKey = (namespace: string, key: string) => {
  if (!namespace) return key
  const prefix = `${namespace}:`
  if (!key.startsWith(prefix)) return null
  return key.slice(prefix.length)
}

class LocalStorageAdapter implements ClientStorageAdapter {
  readonly host: ClientRuntimeHost
  private readonly namespace: string

  constructor(host: ClientRuntimeHost, namespace = '') {
    this.host = host
    this.namespace = namespace
  }

  private listKeys() {
    if (typeof window === 'undefined') return []

    const keys: string[] = []
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const rawKey = window.localStorage.key(index)
      if (!rawKey) continue
      const normalized = fromNamespacedKey(this.namespace, rawKey)
      if (normalized === null) continue
      keys.push(normalized)
    }
    return keys
  }

  private toStorageKey(key: string) {
    return toNamespacedKey(this.namespace, key)
  }

  get length() {
    return this.listKeys().length
  }

  getItem(key: string) {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(this.toStorageKey(key))
  }

  setItem(key: string, value: string) {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(this.toStorageKey(key), value)
  }

  removeItem(key: string) {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(this.toStorageKey(key))
  }

  key(index: number) {
    return this.listKeys()[index] || null
  }
}

class BridgeStorageAdapter implements ClientStorageAdapter {
  readonly host: ClientRuntimeHost
  private readonly bridge: ClientStorageBridge

  constructor(host: ClientRuntimeHost, bridge: ClientStorageBridge) {
    this.host = host
    this.bridge = bridge
  }

  private listKeys() {
    return this.bridge.keys ? this.bridge.keys() : []
  }

  get length() {
    return this.listKeys().length
  }

  getItem(key: string) {
    return this.bridge.getItem(key)
  }

  setItem(key: string, value: string) {
    this.bridge.setItem(key, value)
  }

  removeItem(key: string) {
    this.bridge.removeItem(key)
  }

  key(index: number) {
    return this.listKeys()[index] || null
  }
}

const resolveHostBridge = (host: ClientRuntimeHost): ClientStorageBridge | null => {
  if (typeof window === 'undefined') return null

  const win = window as Window & typeof globalThis & {
    __CHEM_ELECTRON_STORAGE__?: ClientStorageBridge
    __CHEM_CAPACITOR_STORAGE__?: ClientStorageBridge
  }

  if (host === 'electron') {
    return win.__CHEM_ELECTRON_STORAGE__ || null
  }
  if (host === 'capacitor') {
    return win.__CHEM_CAPACITOR_STORAGE__ || null
  }
  return null
}

const migrateLegacyEntriesToNamespace = (host: ClientRuntimeHost, namespace: string) => {
  if (typeof window === 'undefined' || !namespace || host === 'browser') {
    return
  }

  const namespacedStateKey = toNamespacedKey(namespace, CLIENT_RUNTIME_STORAGE_KEYS.state)
  if (window.localStorage.getItem(namespacedStateKey) !== null) {
    return
  }

  const keysToMigrate = [
    CLIENT_RUNTIME_STORAGE_KEYS.state,
    CLIENT_RUNTIME_STORAGE_KEYS.sessions,
    CLIENT_RUNTIME_STORAGE_KEYS.announcements,
    CLIENT_RUNTIME_STORAGE_KEYS.reactions,
    CLIENT_RUNTIME_STORAGE_KEYS.substances,
    CLIENT_RUNTIME_STORAGE_KEYS.configs,
    CLIENT_RUNTIME_STORAGE_KEYS.leaderboard,
    CLIENT_RUNTIME_STORAGE_KEYS.currentSessionId,
    CLIENT_RUNTIME_STORAGE_KEYS.user,
    CLIENT_RUNTIME_STORAGE_KEYS.token,
    CLIENT_RUNTIME_STORAGE_KEYS.accessToken,
    CLIENT_RUNTIME_STORAGE_KEYS.refreshToken,
    CLIENT_RUNTIME_STORAGE_KEYS.theme,
  ]

  keysToMigrate.forEach((legacyKey) => {
    const value = window.localStorage.getItem(legacyKey)
    if (value === null) return
    window.localStorage.setItem(toNamespacedKey(namespace, legacyKey), value)
  })
}

const createClientStorageAdapter = (host: ClientRuntimeHost): ClientStorageAdapter => {
  const bridge = resolveHostBridge(host)
  if (bridge) {
    return new BridgeStorageAdapter(host, bridge)
  }

  const namespace = DEFAULT_HOST_NAMESPACES[host]
  migrateLegacyEntriesToNamespace(host, namespace)
  return new LocalStorageAdapter(host, namespace)
}

export const clientRuntimeStorage: ClientStorageAdapter = createClientStorageAdapter(resolveClientRuntimeHost())

export const getClientRuntimeHost = () => clientRuntimeStorage.host

export const listClientRuntimeKeys = () => {
  const keys: string[] = []
  for (let index = 0; index < clientRuntimeStorage.length; index += 1) {
    const key = clientRuntimeStorage.key(index)
    if (!key) continue
    keys.push(key)
  }
  return keys
}

export const removeClientRuntimeKeys = (keys: readonly string[]) => {
  keys.forEach((key) => clientRuntimeStorage.removeItem(key))
}

export const clearClientRuntimeEntries = (predicate?: (key: string) => boolean) => {
  const keys = listClientRuntimeKeys().filter((key) => (predicate ? predicate(key) : true))
  removeClientRuntimeKeys(keys)
  return keys.length
}

export const exportClientRuntimeEntries = () => {
  const entries: Record<string, string> = {}
  listClientRuntimeKeys().forEach((key) => {
    if (!key) return
    const value = clientRuntimeStorage.getItem(key)
    if (value !== null) {
      entries[key] = value
    }
  })
  return entries
}
