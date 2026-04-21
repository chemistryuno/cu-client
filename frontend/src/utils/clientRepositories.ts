import { CLIENT_RUNTIME_STORAGE_KEYS, clientRuntimeStorage, exportClientRuntimeEntries, removeClientRuntimeKeys } from './clientRuntimeStorage'
import type { ChatMessage, Deck, FeedbackItem, FriendLink, History, State, User } from './clientRuntimeTypes'

export type RuntimeAnnouncement = Record<string, any>
export type RuntimeReactionRecord = Record<string, any>
export type RuntimeSubstanceRecord = Record<string, any>
export type RuntimeConfigRecord = Record<string, any>
export type RuntimeLeaderboardRecord = Record<string, any>

const parseStoredJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const setStoredJson = (key: string, value: unknown) => {
  clientRuntimeStorage.setItem(key, JSON.stringify(value))
}

export const stateRepository = {
  read(seed: State): State {
    return parseStoredJson(CLIENT_RUNTIME_STORAGE_KEYS.state, seed)
  },
  write(state: State) {
    setStoredJson(CLIENT_RUNTIME_STORAGE_KEYS.state, state)
  },
  reset(seed: State) {
    this.write(seed)
    return seed
  },
  export() {
    return exportClientRuntimeEntries()
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
  clearStoredTokens() {
    removeClientRuntimeKeys([
      CLIENT_RUNTIME_STORAGE_KEYS.user,
      CLIENT_RUNTIME_STORAGE_KEYS.token,
      CLIENT_RUNTIME_STORAGE_KEYS.accessToken,
      CLIENT_RUNTIME_STORAGE_KEYS.refreshToken,
    ])
  },
}

export const deckRepository = {
  list(state: State): Deck[] {
    return state.decks
  },
}

export const feedbackRepository = {
  list(state: State): FeedbackItem[] {
    return state.feedbacks
  },
}

export const announcementRepository = {
  list(announcements: RuntimeAnnouncement[]) {
    return announcements
  },
}

export const reactionRepository = {
  list(reactions: RuntimeReactionRecord[]) {
    return reactions
  },
}

export const substanceRepository = {
  list(substances: RuntimeSubstanceRecord[]) {
    return substances
  },
}

export const configRepository = {
  read(config: RuntimeConfigRecord) {
    return config
  },
}

export const leaderboardRepository = {
  read(entries: RuntimeLeaderboardRecord[]) {
    return entries
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
