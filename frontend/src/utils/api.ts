import axios, { AxiosError, type AxiosInstance } from 'axios'
import router from '../router'
import { API_BASE_URL, OFFLINE_MODE } from './runtimeConfig'
import { clearClientAuthState } from './authSession'
import { clientRuntimeAxiosAdapter } from './clientRuntimeService'
import { fetchPubChemSubstanceNames, searchPubChemSubstances } from './pubchem'

interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
}

const apiCache = new Map<string, CacheEntry>()

const getCached = (key: string) => {
  const entry = apiCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > entry.ttl) {
    apiCache.delete(key)
    return null
  }
  return entry.data
}

const setCached = (key: string, data: any, ttl = 5 * 60 * 1000) => {
  apiCache.set(key, { data, timestamp: Date.now(), ttl })
}

const clearAuthState = () => {
  apiCache.clear()
  clearClientAuthState()
}

let isRedirectingToLogin = false
const redirectToLogin = () => {
  if (OFFLINE_MODE || window.location.pathname === '/login' || isRedirectingToLogin) return
  isRedirectingToLogin = true
  const currentPath = window.location.pathname + window.location.search
  router.push({ path: '/login', query: { redirect: currentPath } }).finally(() => {
    isRedirectingToLogin = false
  })
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  adapter: OFFLINE_MODE ? clientRuntimeAxiosAdapter : undefined
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    if (!OFFLINE_MODE && error.response?.status === 401) {
      clearAuthState()
      redirectToLogin()
    }
    return Promise.reject(error)
  }
)

const createCacheKey = (url: string, params?: Record<string, any>) => url + (params ? JSON.stringify(params) : '')

export const authAPI = {
  initializeOfflineProfile: async (data: { nickname: string; avatar: string }) => {
    const response = await api.post('/auth/offline-profile', data)
    clearAuthState()
    return response
  },
  register: (data: any) => api.post('/auth/register', data),
  login: async (data: any) => {
    const response = await api.post('/auth/login', data)
    clearAuthState()
    return response
  },
  logout: () => api.post('/auth/logout'),
  resetOfflineProfile: async () => {
    const response = await api.post('/auth/offline-profile/reset')
    clearAuthState()
    return response
  },
  getAuthConfig: () => api.get('/auth/config'),
  unbindOAuth: (provider: string) => api.post(`/auth/oauth/unbind?provider=${provider}`),
  sendCode: (email: string, type = 'register', recaptcha_token?: string) => api.post('/auth/send-code', { email, type, recaptcha_token }),
  resetPasswordByEmail: (data: any) => api.post('/auth/reset-password', data),
  resetPasswordBy2FA: (data: any) => api.post('/auth/2fa/reset-password', data),
  beginWebAuthnLogin: (identifier = '') => api.get(`/auth/webauthn/login/begin${identifier ? `?identifier=${encodeURIComponent(identifier)}` : ''}`),
  finishWebAuthnLogin: (credential: any, identifier = '') => api.post(`/auth/webauthn/login/finish${identifier ? `?identifier=${encodeURIComponent(identifier)}` : ''}`, credential),
  beginResetPasswordWebAuthn: (identifier: string) => api.post('/auth/webauthn/reset-password/begin', { identifier }),
  finishResetPasswordWebAuthn: (identifier: string, newPassword: string, credential: any) => api.post(`/auth/webauthn/reset-password/finish?identifier=${encodeURIComponent(identifier)}&new_password=${encodeURIComponent(newPassword)}`, credential),
  getUserInfo: async () => {
    const cached = getCached('user_info')
    if (cached) return { data: cached }
    const response = await api.get('/user/info')
    setCached('user_info', response.data, 60 * 1000)
    return response
  },
  changePassword: (oldPassword: string, newPassword: string, code = '', useEmail = false) => api.put('/user/password', { old_password: oldPassword, new_password: newPassword, code, use_email: useEmail }),
  beginChangePasswordWebAuthn: () => api.post('/user/webauthn/change-password/begin'),
  finishChangePasswordWebAuthn: (newPassword: string, credential: any) => api.post(`/user/webauthn/change-password/finish?newPassword=${newPassword}`, credential),
  updateAvatar: async (avatar: string) => {
    const response = await api.put('/user/avatar', { avatar })
    apiCache.delete('user_info')
    return response
  },
  updateProfile: async (data: any) => {
    const response = await api.put('/user/profile', data)
    apiCache.delete('user_info')
    return response
  },
  getUserPublicProfile: (uid: number) => api.get(`/user/profile/${uid}`),
  changeEmail: (data: any) => api.post('/user/change-email', data),
  setEmail: (data: any) => api.post('/user/set-email', data),
  getMySecurityQuestion: () => api.get('/user/security-question'),
  updateSecurityQuestion: (data: any) => api.put('/user/security-question', data),
  getSecurityQuestion: (username: string) => api.get(`/auth/security-question?username=${encodeURIComponent(username)}`),
  resetPasswordBySecurityQuestion: (data: any) => api.post('/auth/security-question/reset-password', data),
  deleteAccount: (code: string) => api.delete('/user/account', { data: { code } }),
  deleteAccountWithSecurityAnswer: (securityAnswer: string) => api.delete('/user/account', { data: { security_answer: securityAnswer } }),
  searchUsers: (query: string) => api.get(`/users/search?q=${encodeURIComponent(query)}`),
  submitFeedback: (content: string, type: string) => api.post('/feedback', { content, type }),
  getMyFeedbacks: () => api.get('/feedbacks/my'),
  urgeFeedback: (id: number) => api.post(`/feedbacks/${id}/urge`),
  withdrawFeedback: (id: number) => api.post('/feedback/withdraw', { id }),
  dismissFeedback: (id: number) => api.post(`/feedbacks/${id}/dismiss`),
  getActiveSurveys: () => api.get('/surveys/active'),
  getAllActiveSurveys: () => api.get('/surveys/all'),
  dismissSurvey: (id: number) => api.post(`/surveys/${id}/dismiss`),
  getSurveyDetail: (id: number) => api.get(`/surveys/${id}`),
  submitSurveyAnswers: (id: number, answers: any[]) => api.post(`/surveys/${id}/submit`, { answers }),
  getGlobalChatHistory: (limit = 50) => api.get(`/chat/global/history?limit=${limit}`),
  getPrivateChatHistory: (friendUID: number, limit = 50) => api.get(`/chat/private/history/${friendUID}?limit=${limit}`),
  setup2FA: () => api.post('/user/2fa/setup'),
  enable2FA: (code: string, password: string) => api.post('/user/2fa/enable', { code, password }),
  disable2FA: (code: string) => api.post('/user/2fa/disable', { code }),
  getVersion: () => api.get('/version'),
  verify2FALogin: (uid: number, code: string) => api.post('/auth/2fa/verify', { uid, code }),
  getSessions: () => api.get('/user/sessions'),
  logoutSession: (id: string) => api.post('/user/sessions/logout', { id }),
  freezeAccount: (hours: number) => api.post('/user/account/freeze', { hours }),
  getWebAuthnCredentials: () => api.get('/user/webauthn/credentials'),
  beginWebAuthnRegistration: () => api.get('/user/webauthn/register/begin'),
  finishWebAuthnRegistration: (credential: any) => api.post('/user/webauthn/register/finish', credential),
  removeWebAuthnCredential: (id: string) => api.delete(`/user/webauthn/credentials/${id}`)
}

export const levelAPI = {
  getLevelInfo: () => api.get('/level/info'),
  getUserLevelInfo: (uid: number) => api.get(`/level/user/${uid}`),
  getLeaderboard: () => api.get('/level/leaderboard'),
  getConfigs: () => api.get('/level/configs')
}

export const gameAPI = {
  getRooms: async () => {
    const key = 'rooms_list'
    const cached = getCached(key)
    if (cached) return { data: cached }
    const response = await api.get('/rooms')
    setCached(key, response.data, 60 * 1000)
    return response
  },
  createRoom: (name: string, maxPlayers: number, deckID: number, isPointsMode = false, isPrivate = false, accessKey?: string, isPvE = false, pveDifficulty = 0, aiCount = 0, enableAIBackfill = false, aiBackfillDifficulty = 50, tutorialScript = false) => api.post('/rooms', {
    name,
    max_players: maxPlayers,
    deck_id: deckID,
    is_points_mode: isPointsMode,
    is_private: isPrivate,
    access_key: accessKey,
    is_pve: isPvE,
    pve_difficulty: pveDifficulty,
    ai_count: aiCount,
    enable_ai_backfill: enableAIBackfill,
    ai_backfill_difficulty: aiBackfillDifficulty,
    tutorial_script: tutorialScript
  }),
  getRoomState: (roomId: string) => api.get(`/rooms/${roomId}`),
  checkRoomStatus: (roomId: string) => api.get(`/rooms/${roomId}/status`),
  joinRoom: (roomId: string, accessKey?: string, asSpectator?: boolean) => {
    const params: string[] = []
    if (accessKey) params.push(`key=${encodeURIComponent(accessKey)}`)
    if (asSpectator) params.push('spectator=true')
    const suffix = params.length ? `?${params.join('&')}` : ''
    return api.post(`/rooms/${roomId}/join${suffix}`)
  },
  spectateRoom: (roomId: string, accessKey?: string) => gameAPI.joinRoom(roomId, accessKey, true),
  leaveRoom: (roomId: string) => api.post(`/rooms/${roomId}/leave`),
  ready: (roomId: string) => api.post(`/rooms/${roomId}/ready`),
  startGame: (roomId: string) => api.post(`/rooms/${roomId}/start`),
  initiateDuel: (target_uid: number) => api.post('/game/duel', { target_uid }),
  respondToDuel: (target_uid: number, accept: boolean) => api.post('/game/duel/respond', { target_uid, accept }),
  getMyGameHistory: () => api.get('/user/game-history'),
  getMyGameReplay: (historyId: number) => api.get(`/user/game-history/${historyId}/replay`),
  playCard: (roomId: string, card: any, substance: string) => api.post(`/rooms/${roomId}/play`, { card, substance }),
  playDouble: (roomId: string, sub1: string, sub2: string) => api.post(`/rooms/${roomId}/play-double`, { sub1, sub2 }),
  drawCard: (roomId: string) => api.post(`/rooms/${roomId}/draw`),
  getAvailableSubstances: (roomId: string) => api.get(`/rooms/${roomId}/substances`),
  getReactionHints: (roomId: string) => api.get(`/rooms/${roomId}/reaction-hints`),
  checkReaction: (r1: string, r2: string) => api.post('/game/check-reaction', { r1, r2 }),
  getMyDecks: () => api.get('/my-decks'),
  createMyDeck: (name: string, cards: Record<string, number>, initialCards?: number) => api.post('/my-decks', { name, cards, initial_cards: initialCards }),
  updateMyDeck: (id: number, name: string, cards: Record<string, number>, initialCards?: number) => api.put(`/my-decks/${id}`, { name, cards, initial_cards: initialCards }),
  deleteMyDeck: (id: number) => api.delete(`/my-decks/${id}`)
}





export const commonAPI = {
  getAnnouncements: () => api.get('/announcements'),
  getHints: () => api.get('/hints'),
  exportLocalRuntimeData: () => api.post('/runtime/export'),
  importLocalRuntimeData: (payload: { entries?: Record<string, string>; sqlite?: { data?: string }; bundle?: { entries?: Record<string, string>; sqlite?: { data?: string } }; mode?: 'merge' | 'replace' }) =>
    api.post('/runtime/import', payload)
}

export const reactionAPI = {
  getReactions: (params?: Record<string, any>) => api.get('/reactions', { params }),
  getAllReactions: (params?: Record<string, any>) => api.get('/reactions/all', { params }),
  getMyReactions: (params?: Record<string, any>) => api.get('/reactions/my', { params }),
  addReaction: (display: string) => api.post('/reactions', { display }),
  batchAddReactions: (reactions: { display: string }[]) => api.post('/reactions/batch', reactions),
  updateReaction: (id: number, display: string) => api.put(`/reactions/${id}`, { display }),
  approveReaction: (groupId: string, display: string, reject = false) => api.put(`/reactions/approve/${groupId}`, { display, reject }),
  deleteReaction: (reactionId: number) => api.delete(`/reactions/${reactionId}`)
}

export const substanceAPI = {
  getSubstanceNames: async () => {
    const key = createCacheKey('/substances/names')
    const cached = getCached(key)
    if (cached) return { data: cached }
    const fallbackResponse = await api.get('/substances/names')
    const fallbackNames = fallbackResponse.data || {}
    try {
      const pubchemNames = await fetchPubChemSubstanceNames(Object.keys(fallbackNames))
      const merged = {
        ...fallbackNames,
        ...pubchemNames,
      }
      setCached(key, merged, 30 * 60 * 1000)
      return { data: merged }
    } catch {
      setCached(key, fallbackNames, 30 * 60 * 1000)
      return fallbackResponse
    }
  },
  getSubstances: async (query = '') => {
    const key = createCacheKey('/data/substances', { query })
    const cached = getCached(key)
    if (cached) return { data: cached }
    const fallbackResponse = await api.get('/data/substances')
    const fallbackList = Array.isArray(fallbackResponse.data) ? fallbackResponse.data : []
    try {
      const pubchemList = await searchPubChemSubstances(query)
      const merged = query
        ? (pubchemList.length > 0 ? pubchemList : fallbackList.filter((item: any) => {
            const term = String(query).trim().toLowerCase()
            return String(item?.formula || '').toLowerCase().includes(term) || String(item?.name || '').toLowerCase().includes(term)
          }))
        : fallbackList
      setCached(key, merged, 10 * 60 * 1000)
      return { data: merged }
    } catch {
      setCached(key, fallbackList, 30 * 60 * 1000)
      return fallbackResponse
    }
  },
  getMySubstances: () => api.get('/data/substances/my'),
  getSubstanceGroup: (id: number) => api.get(`/data/substances/${id}/group`),
  submitNewSubstance: (formula: string, name: string, elements?: string) => api.post('/data/substances/new', { formula, name, elements }),
  submitSubstanceUpdate: (id: number, formula: string, name: string, elements?: string) => api.post(`/data/substances/${id}/update`, { formula, name, elements }),
  updateSubstance: (id: number, formula: string, name: string, elements?: string) => api.put(`/data/substances/${id}`, { formula, name, elements }),
  approveSubstance: (id: number) => api.post(`/data/substances/${id}/approve`),
  rejectSubstance: (id: number) => api.delete(`/data/substances/${id}/reject`)
}

export const pluginAPI = {
  getPluginCards: () => api.get('/plugin-cards'),
  getPluginsWithCards: () => api.get('/plugins'),
  getPluginScript: (pluginId: number) => api.get(`/plugins/${pluginId}/script`, { responseType: 'text' }),
  getPluginSettings: (pluginId: number) => api.get(`/plugins/${pluginId}/settings`),
}

export const invalidateApiCache = (...keys: string[]) => {
  keys.forEach((key) => apiCache.delete(key))
}

export default api
