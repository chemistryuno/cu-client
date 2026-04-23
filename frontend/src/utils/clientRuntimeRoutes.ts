import type { ClientRuntimeModule, RuntimeRouteDefinition } from './clientRuntimeTypes'

export const CLIENT_RUNTIME_ROUTE_INVENTORY: RuntimeRouteDefinition[] = [
  { module: 'auth', methods: ['POST'], pattern: '/auth/offline-profile', description: 'Initialize local offline profile' },
  { module: 'auth', methods: ['POST'], pattern: '/auth/offline-profile/reset', description: 'Reset local offline profile' },
  { module: 'auth', methods: ['POST'], pattern: '/auth/register', description: 'Create local user identity' },
  { module: 'auth', methods: ['POST'], pattern: '/auth/login', description: 'Restore local authenticated identity' },
  { module: 'auth', methods: ['POST'], pattern: '/auth/logout', description: 'Clear active local session' },
  { module: 'auth', methods: ['GET'], pattern: '/auth/config', description: 'Read local auth feature config' },
  { module: 'auth', methods: ['POST'], pattern: '/auth/refresh', description: 'Refresh local auth tokens' },
  { module: 'auth', methods: ['POST'], pattern: '/auth/oauth/unbind', description: 'Unbind external auth provider in local mode' },
  { module: 'auth', methods: ['POST'], pattern: '/auth/send-code', description: 'Submit verification code request through local auth runtime' },
  { module: 'auth', methods: ['POST'], pattern: '/auth/reset-password', description: 'Reset password through local auth runtime' },
  { module: 'auth', methods: ['POST'], pattern: '/auth/2fa/verify', description: 'Verify local 2FA challenge' },
  { module: 'auth', methods: ['POST'], pattern: '/auth/2fa/reset-password', description: 'Reset password with 2FA in local runtime' },
  { module: 'auth', methods: ['GET', 'POST'], pattern: '/auth/webauthn/*', description: 'Run WebAuthn entry flows via client runtime' },
  { module: 'auth', methods: ['GET'], pattern: '/auth/security-question', description: 'Read account recovery question' },
  { module: 'auth', methods: ['POST'], pattern: '/auth/security-question/reset-password', description: 'Reset password with security question' },
  { module: 'auth', methods: ['GET'], pattern: '/user/info', description: 'Read active local identity' },
  { module: 'auth', methods: ['PUT'], pattern: '/user/password', description: 'Update local password state' },
  { module: 'auth', methods: ['PUT'], pattern: '/user/avatar', description: 'Update avatar in local identity state' },
  { module: 'auth', methods: ['PUT'], pattern: '/user/profile', description: 'Update private local profile' },
  { module: 'auth', methods: ['GET'], pattern: '/user/profile/:uid', description: 'Read public local profile' },
  { module: 'auth', methods: ['POST'], pattern: '/user/change-email', description: 'Change bound email locally' },
  { module: 'auth', methods: ['POST'], pattern: '/user/set-email', description: 'Bind local email value' },
  { module: 'auth', methods: ['GET', 'PUT'], pattern: '/user/security-question', description: 'Manage security question locally' },
  { module: 'auth', methods: ['DELETE'], pattern: '/user/account', description: 'Delete local account data' },
  { module: 'auth', methods: ['GET'], pattern: '/user/sessions', description: 'List local sessions' },
  { module: 'auth', methods: ['POST'], pattern: '/user/sessions/logout', description: 'Revoke a local session' },
  { module: 'auth', methods: ['POST'], pattern: '/user/account/freeze', description: 'Freeze account in local auth state' },
  { module: 'auth', methods: ['POST'], pattern: '/user/2fa/*', description: 'Run local 2FA settings flows' },
  { module: 'auth', methods: ['GET', 'POST', 'DELETE'], pattern: '/user/webauthn/*', description: 'Manage local WebAuthn credentials' },
  { module: 'auth', methods: ['GET'], pattern: '/users/search', description: 'Search local user directory' },

  { module: 'data', methods: ['GET'], pattern: '/announcements', description: 'Read visible announcements' },
  { module: 'data', methods: ['GET'], pattern: '/hints', description: 'Read hint content' },
  { module: 'data', methods: ['POST'], pattern: '/feedback', description: 'Create feedback entry' },
  { module: 'data', methods: ['GET'], pattern: '/feedbacks/my', description: 'Read current user feedback entries' },
  { module: 'data', methods: ['POST'], pattern: '/feedbacks/:id/urge', description: 'Urge feedback processing' },
  { module: 'data', methods: ['POST'], pattern: '/feedback/withdraw', description: 'Withdraw feedback entry' },
  { module: 'data', methods: ['POST'], pattern: '/feedbacks/:id/dismiss', description: 'Dismiss feedback prompt' },
  { module: 'data', methods: ['GET', 'POST'], pattern: '/surveys/*', description: 'Read and submit survey state' },
  { module: 'data', methods: ['GET'], pattern: '/chat/*', description: 'Read local chat history' },
  { module: 'data', methods: ['GET'], pattern: '/level/*', description: 'Read level and leaderboard information' },
  { module: 'data', methods: ['GET'], pattern: '/my-decks', description: 'Read local deck data' },
  { module: 'data', methods: ['POST', 'PUT', 'DELETE'], pattern: '/my-decks/:id?', description: 'Create and edit local decks' },
  { module: 'data', methods: ['GET'], pattern: '/data/substances', description: 'Read local substance catalog' },
  { module: 'data', methods: ['GET'], pattern: '/data/substances/my', description: 'Read user-owned substances' },
  { module: 'data', methods: ['GET'], pattern: '/data/substances/:id/group', description: 'Read substance group details' },
  { module: 'data', methods: ['GET'], pattern: '/substances/names', description: 'Read substance name index' },
  { module: 'data', methods: ['GET'], pattern: '/reactions', description: 'Read filtered reactions' },
  { module: 'data', methods: ['GET'], pattern: '/reactions/all', description: 'Read approved reactions' },
  { module: 'data', methods: ['GET'], pattern: '/reactions/my', description: 'Read current user reactions' },
  { module: 'data', methods: ['GET'], pattern: '/friends', description: 'Read local friend graph' },
  { module: 'data', methods: ['POST'], pattern: '/friends/request', description: 'Create local friend link' },
  { module: 'data', methods: ['GET'], pattern: '/friends/pending', description: 'Read pending friend requests' },
  { module: 'data', methods: ['POST'], pattern: '/friends/handle', description: 'Resolve friend request locally' },
  { module: 'data', methods: ['DELETE'], pattern: '/friends/:uid', description: 'Delete local friend link' },
  { module: 'data', methods: ['POST'], pattern: '/friends/remark', description: 'Update local friend remark' },
  { module: 'data', methods: ['GET'], pattern: '/plugins', description: 'Read local plugin catalog' },
  { module: 'data', methods: ['GET'], pattern: '/plugin-cards', description: 'Read local plugin card data' },
  { module: 'data', methods: ['GET'], pattern: '/plugins/:id/*', description: 'Read local plugin assets and settings' },
  { module: 'data', methods: ['POST'], pattern: '/runtime/export', description: 'Export local runtime data bundle' },
  { module: 'data', methods: ['POST'], pattern: '/runtime/import', description: 'Import local runtime data bundle' },
  { module: 'data', methods: ['GET'], pattern: '/version', description: 'Read local runtime version' },

  { module: 'game', methods: ['GET', 'POST'], pattern: '/rooms', description: 'List and create rooms' },
  { module: 'game', methods: ['GET'], pattern: '/rooms/:id', description: 'Read room snapshot' },
  { module: 'game', methods: ['GET'], pattern: '/rooms/:id/status', description: 'Read room status' },
  { module: 'game', methods: ['POST'], pattern: '/rooms/:id/join', description: 'Join room or spectate' },
  { module: 'game', methods: ['POST'], pattern: '/rooms/:id/leave', description: 'Leave room' },
  { module: 'game', methods: ['POST'], pattern: '/rooms/:id/ready', description: 'Toggle room readiness' },
  { module: 'game', methods: ['POST'], pattern: '/rooms/:id/start', description: 'Start game from local room state' },
  { module: 'game', methods: ['POST'], pattern: '/rooms/:id/play', description: 'Submit local play action' },
  { module: 'game', methods: ['POST'], pattern: '/rooms/:id/play-double', description: 'Submit local double play action' },
  { module: 'game', methods: ['POST'], pattern: '/rooms/:id/draw', description: 'Draw cards from local game engine' },
  { module: 'game', methods: ['GET'], pattern: '/rooms/:id/substances', description: 'Read playable substances in room' },
  { module: 'game', methods: ['GET'], pattern: '/rooms/:id/reaction-hints', description: 'Read reaction hints in room' },
  { module: 'game', methods: ['POST'], pattern: '/game/duel', description: 'Create duel request in local runtime' },
  { module: 'game', methods: ['POST'], pattern: '/game/duel/respond', description: 'Respond to duel request in local runtime' },
  { module: 'game', methods: ['POST'], pattern: '/game/check-reaction', description: 'Validate chemistry reaction locally' },
  { module: 'game', methods: ['GET'], pattern: '/user/game-history', description: 'Read local game history' },
  { module: 'game', methods: ['GET'], pattern: '/user/game-history/:id/replay', description: 'Read local replay payload' },

  { module: 'admin', methods: ['POST', 'PUT', 'DELETE'], pattern: '/reactions*', description: 'Moderate reaction records locally' },
  { module: 'admin', methods: ['POST', 'PUT', 'DELETE'], pattern: '/data/substances*', description: 'Moderate substance records locally' },
  { module: 'admin', methods: ['GET', 'POST', 'PUT', 'DELETE'], pattern: '/admin/*', description: 'Run privileged admin workflows' },
]

const normalizePattern = (value: string) => value.replace(/^\/api/, '').replace(/\/$/, '') || '/'

const patternToRegExp = (pattern: string) => {
  const normalized = normalizePattern(pattern)
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\:([A-Za-z0-9_]+)\?/g, '[^/]+')
    .replace(/\\:([A-Za-z0-9_]+)/g, '[^/]+')
    .replace(/\\\*/g, '.*')
  return new RegExp(`^${normalized}$`)
}

export const normalizeClientRuntimePath = (url: string) => {
  const parsed = new URL(url, 'http://runtime.local')
  return normalizePattern(parsed.pathname)
}

export const getClientRuntimeModule = (url: string, method = 'GET'): ClientRuntimeModule => {
  const normalizedMethod = method.toUpperCase()
  const normalizedPath = normalizeClientRuntimePath(url)
  const matched = CLIENT_RUNTIME_ROUTE_INVENTORY.find((route) => {
    if (!route.methods.includes(normalizedMethod)) return false
    return patternToRegExp(route.pattern).test(normalizedPath)
  })
  return matched?.module || 'data'
}
