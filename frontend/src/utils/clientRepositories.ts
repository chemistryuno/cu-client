import {
  CLIENT_RUNTIME_STORAGE_KEYS,
  clearClientRuntimeEntries,
  clientRuntimeStorage,
  exportClientRuntimeEntries,
  getClientRuntimeHost,
  listClientRuntimeKeys,
  removeClientRuntimeKeys,
} from './clientRuntimeStorage'
import { runtimeSqlite } from './clientRuntimeDatabase'
import type {
  ChatMessage,
  Deck,
  FeedbackItem,
  FriendLink,
  History,
  RuntimeExportBundle,
  RuntimeSessionMetadata,
  State,
  User,
} from './clientRuntimeTypes'

export type RuntimeAnnouncement = Record<string, any>
export type RuntimeReactionRecord = Record<string, any>
export type RuntimeSubstanceRecord = Record<string, any>
export type RuntimeConfigRecord = Record<string, any>
export type RuntimeLeaderboardRecord = Record<string, any>
export type RuntimeSessionContext = {
  userAgent?: string
  ip?: string
  host?: RuntimeSessionMetadata['host']
  mode?: RuntimeSessionMetadata['mode']
  expiresAt?: string | null
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const nowISO = () => new Date().toISOString()

const createSessionId = () => `offline-session-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`

const parseStoredJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const readStoredJson = <T>(key: string, fallback: T): T => parseStoredJson(clientRuntimeStorage.getItem(key), fallback)

const writeStoredJson = (key: string, value: unknown) => {
  clientRuntimeStorage.setItem(key, JSON.stringify(value))
}

const readStoredSessions = () => readStoredJson<RuntimeSessionMetadata[]>(CLIENT_RUNTIME_STORAGE_KEYS.sessions, [])

const writeStoredSessions = (sessions: RuntimeSessionMetadata[]) => {
  writeStoredJson(CLIENT_RUNTIME_STORAGE_KEYS.sessions, sessions)
}

const isExpiredSession = (session: RuntimeSessionMetadata, now = Date.now()) => {
  if (!session.expires_at) return false
  const expiresAt = new Date(session.expires_at).getTime()
  return Number.isFinite(expiresAt) && expiresAt <= now
}

const normalizeSessions = (sessions: RuntimeSessionMetadata[]) => {
  const map = new Map<string, RuntimeSessionMetadata>()
  sessions.forEach((session) => {
    if (!session?.id) return
    map.set(session.id, session)
  })
  return Array.from(map.values()).sort((left, right) => {
    const leftTs = new Date(left.last_active || left.created_at || 0).getTime()
    const rightTs = new Date(right.last_active || right.created_at || 0).getTime()
    return rightTs - leftTs
  })
}

export const stateRepository = {
  read(seed: State): State {
    return readStoredJson(CLIENT_RUNTIME_STORAGE_KEYS.state, seed)
  },
  write(state: State) {
    writeStoredJson(CLIENT_RUNTIME_STORAGE_KEYS.state, state)
  },
  reset(seed: State) {
    this.write(seed)
    return seed
  },
  keys() {
    return listClientRuntimeKeys()
  },
  clear(predicate?: (key: string) => boolean) {
    return clearClientRuntimeEntries(predicate)
  },
  export() {
    return exportClientRuntimeEntries()
  },
  exportBundle(): RuntimeExportBundle {
    return {
      version: 1,
      exported_at: nowISO(),
      host: getClientRuntimeHost(),
      entries: this.export(),
    }
  },
  import(entries: Record<string, string>) {
    Object.entries(entries).forEach(([key, value]) => clientRuntimeStorage.setItem(key, value))
  },
}

export const userRepository = {
  list(state: State): User[] {
    return state.users
  },
  replace(state: State, users: User[]) {
    state.users = users
  },
  upsert(state: State, user: User) {
    const index = state.users.findIndex((item) => item.uid === user.uid)
    if (index >= 0) {
      state.users[index] = user
    } else {
      state.users.push(user)
    }
    return user
  },
  current(state: State) {
    return state.users.find((user) => user.uid === state.session_uid) || null
  },
}

export const sessionRepository = {
  getSessionUid(state: State) {
    return state.session_uid
  },
  setSessionUid(state: State, uid: number | null) {
    state.session_uid = uid
  },
  list(uid?: number) {
    const sessions = normalizeSessions(readStoredSessions())
    if (typeof uid !== 'number') {
      return sessions
    }
    return sessions.filter((session) => session.uid === uid)
  },
  listActive(uid?: number) {
    const now = Date.now()
    return this.list(uid).filter((session) => !session.revoked_at && !isExpiredSession(session, now))
  },
  getCurrentSessionId() {
    return clientRuntimeStorage.getItem(CLIENT_RUNTIME_STORAGE_KEYS.currentSessionId)
  },
  setCurrentSessionId(sessionId: string | null) {
    if (!sessionId) {
      clientRuntimeStorage.removeItem(CLIENT_RUNTIME_STORAGE_KEYS.currentSessionId)
      return
    }
    clientRuntimeStorage.setItem(CLIENT_RUNTIME_STORAGE_KEYS.currentSessionId, sessionId)
  },
  create(uid: number, context: RuntimeSessionContext = {}) {
    const createdAt = nowISO()
    const expiresAt = context.expiresAt === undefined
      ? new Date(Date.now() + SESSION_TTL_MS).toISOString()
      : context.expiresAt
    const session: RuntimeSessionMetadata = {
      id: createSessionId(),
      uid,
      user_agent: context.userAgent || 'offline-runtime',
      ip: context.ip || '127.0.0.1',
      host: context.host || getClientRuntimeHost(),
      mode: context.mode || 'offline',
      created_at: createdAt,
      last_active: createdAt,
      expires_at: expiresAt,
      revoked_at: null,
    }
    const sessions = normalizeSessions([...readStoredSessions(), session])
    writeStoredSessions(sessions)
    this.setCurrentSessionId(session.id)
    return session
  },
  touch(sessionId: string, touchedAt = nowISO(), uid?: number) {
    const sessions = readStoredSessions()
    let changed = false
    const updated = sessions.map((session) => {
      if (session.id !== sessionId) {
        return session
      }
      if (typeof uid === 'number' && session.uid !== uid) {
        return session
      }
      changed = true
      return {
        ...session,
        last_active: touchedAt,
      }
    })
    if (!changed) return false
    writeStoredSessions(normalizeSessions(updated))
    return true
  },
  revoke(sessionId: string, revokedAt = nowISO(), uid?: number) {
    const sessions = readStoredSessions()
    let changed = false
    const updated = sessions.map((session) => {
      if (session.id !== sessionId) {
        return session
      }
      if (typeof uid === 'number' && session.uid !== uid) {
        return session
      }
      changed = true
      return {
        ...session,
        revoked_at: revokedAt,
      }
    })
    if (!changed) return false
    writeStoredSessions(normalizeSessions(updated))
    return true
  },
  pruneExpired(now = Date.now()) {
    const sessions = readStoredSessions()
    const kept = sessions.filter((session) => !isExpiredSession(session, now))
    if (kept.length === sessions.length) {
      return 0
    }
    writeStoredSessions(normalizeSessions(kept))
    return sessions.length - kept.length
  },
  clearStoredTokens() {
    removeClientRuntimeKeys([
      CLIENT_RUNTIME_STORAGE_KEYS.user,
      CLIENT_RUNTIME_STORAGE_KEYS.token,
      CLIENT_RUNTIME_STORAGE_KEYS.accessToken,
      CLIENT_RUNTIME_STORAGE_KEYS.refreshToken,
      CLIENT_RUNTIME_STORAGE_KEYS.currentSessionId,
    ])
  },
}

export const deckRepository = {
  list(state: State): Deck[] {
    return state.decks
  },
  upsert(state: State, deck: Deck) {
    const index = state.decks.findIndex((item) => item.id === deck.id)
    if (index >= 0) {
      state.decks[index] = deck
    } else {
      state.decks.push(deck)
    }
    return deck
  },
  remove(state: State, deckId: number) {
    state.decks = state.decks.filter((deck) => deck.id !== deckId)
  },
}

export const feedbackRepository = {
  list(state: State): FeedbackItem[] {
    return state.feedbacks
  },
  upsert(state: State, item: FeedbackItem) {
    const index = state.feedbacks.findIndex((feedback) => feedback.id === item.id)
    if (index >= 0) {
      state.feedbacks[index] = item
    } else {
      state.feedbacks.unshift(item)
    }
    return item
  },
}

export const announcementRepository = {
  read(fallback: RuntimeAnnouncement[] = []) {
    const records = runtimeSqlite.listAnnouncements()
    if (records.length || fallback.length === 0) return records
    return runtimeSqlite.replaceAnnouncements(fallback)
  },
  write(announcements: RuntimeAnnouncement[]) {
    return runtimeSqlite.replaceAnnouncements(announcements)
  },
  list(fallback: RuntimeAnnouncement[] = []) {
    return this.read(fallback)
  },
}

export const reactionRepository = {
  read(fallback: RuntimeReactionRecord[] = []) {
    const records = runtimeSqlite.listReactions()
    if (records.length || fallback.length === 0) return records
    return runtimeSqlite.replaceReactions(fallback)
  },
  write(reactions: RuntimeReactionRecord[]) {
    return runtimeSqlite.replaceReactions(reactions)
  },
  list(fallback: RuntimeReactionRecord[] = []) {
    return this.read(fallback)
  },
}

export const substanceRepository = {
  read(fallback: RuntimeSubstanceRecord[] = []) {
    const records = runtimeSqlite.listSubstances()
    if (records.length || fallback.length === 0) return records
    return runtimeSqlite.replaceSubstances(fallback)
  },
  write(substances: RuntimeSubstanceRecord[]) {
    return runtimeSqlite.replaceSubstances(substances)
  },
  list(fallback: RuntimeSubstanceRecord[] = []) {
    return this.read(fallback)
  },
}

export const configRepository = {
  read(fallback: RuntimeConfigRecord = {}) {
    const records = runtimeSqlite.readConfigs(fallback)
    if (records === fallback && Object.keys(fallback).length > 0) {
      return runtimeSqlite.replaceConfigs(fallback)
    }
    return records
  },
  write(config: RuntimeConfigRecord) {
    return runtimeSqlite.replaceConfigs(config)
  },
  merge(partial: RuntimeConfigRecord, fallback: RuntimeConfigRecord = {}) {
    const next = {
      ...this.read(fallback),
      ...partial,
    }
    this.write(next)
    return next
  },
}

export const leaderboardRepository = {
  read(fallback: RuntimeLeaderboardRecord[] = []) {
    const records = runtimeSqlite.listLeaderboard()
    return records.length ? records : fallback
  },
  write(entries: RuntimeLeaderboardRecord[]) {
    return runtimeSqlite.replaceLeaderboard(entries)
  },
}

export const historyRepository = {
  list(state: State): History[] {
    return state.histories
  },
}

export const friendRepository = {
  list(state: State): FriendLink[] {
    return state.friends
  },
}

export const chatRepository = {
  list(state: State): ChatMessage[] {
    return state.global_messages
  },
}
