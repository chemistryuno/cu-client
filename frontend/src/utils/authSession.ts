import type { Router } from 'vue-router'
import websocket from './websocket'
import { buildApiURL } from './runtimeConfig'

const OAUTH_REDIRECT_KEY = 'oauth_redirect'
const STARTUP_AUTH_TIMEOUT_MS = 8000

const AUTH_STORAGE_KEYS = ['user', 'token', 'access_token', 'refresh_token'] as const

type StoredUser = Record<string, any> | null

type ClearAuthOptions = {
  disconnectSocket?: boolean
  dispatchEvent?: boolean
}

let authReadyPromise: Promise<void> | null = null

const dispatchAuthChanged = () => {
  window.dispatchEvent(new Event('auth-changed'))
}

const fetchWithTimeout = async (url: string, init: RequestInit = {}, timeoutMs = STARTUP_AUTH_TIMEOUT_MS) => {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timer)
  }
}

const normalizeUser = (payload: any): StoredUser => {
  const user = payload?.user ?? payload
  return user && user.uid ? user : null
}

export const getSafeInternalRedirect = (value: unknown, fallback = '/'): string => {
  const redirect = typeof value === 'string' ? value.trim() : ''
  if (redirect.startsWith('/') && !redirect.startsWith('//')) {
    return redirect
  }
  return fallback
}

export const getStoredUser = (): StoredUser => {
  const rawUser = localStorage.getItem('user')
  if (!rawUser) return null

  try {
    return JSON.parse(rawUser)
  } catch (error) {
    console.error('[Auth] Failed to parse stored user', error)
    localStorage.removeItem('user')
    return null
  }
}

export const setAuthenticatedUser = (user: any, dispatchEvent = true) => {
  localStorage.setItem('user', JSON.stringify(user))
  if (dispatchEvent) {
    dispatchAuthChanged()
  }
}

export const clearClientAuthState = ({ disconnectSocket = true, dispatchEvent = true }: ClearAuthOptions = {}) => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
  sessionStorage.removeItem(OAUTH_REDIRECT_KEY)

  if (disconnectSocket) {
    websocket.disconnect()
  }

  if (dispatchEvent) {
    dispatchAuthChanged()
  }
}

export const rememberPendingAuthRedirect = (redirect: unknown) => {
  const safeRedirect = getSafeInternalRedirect(redirect, '')
  if (safeRedirect) {
    sessionStorage.setItem(OAUTH_REDIRECT_KEY, safeRedirect)
  } else {
    sessionStorage.removeItem(OAUTH_REDIRECT_KEY)
  }
}

export const consumePendingAuthRedirect = (fallback?: unknown) => {
  const storedRedirect = sessionStorage.getItem(OAUTH_REDIRECT_KEY)
  sessionStorage.removeItem(OAUTH_REDIRECT_KEY)

  if (storedRedirect) {
    return getSafeInternalRedirect(storedRedirect)
  }

  return getSafeInternalRedirect(fallback, '/')
}

export const completeAuthSuccess = ({
  user,
  router,
  redirect,
  replace = false,
}: {
  user: any
  router: Pick<Router, 'push' | 'replace'>
  redirect?: unknown
  replace?: boolean
}) => {
  setAuthenticatedUser(user)
  websocket.connect()

  const target = consumePendingAuthRedirect(redirect)
  if (replace) {
    return router.replace(target)
  }
  return router.push(target)
}

const verifyStartupSession = async () => {
  const storedUser = getStoredUser()

  try {
    const userInfoResp = await fetchWithTimeout(buildApiURL('/user/info'), {
      method: 'GET',
      credentials: 'include',
    })

    if (userInfoResp.ok) {
      const payload = await userInfoResp.json().catch(() => null)
      const user = normalizeUser(payload)
      if (user) {
        setAuthenticatedUser(user, false)
        return
      }

      if (storedUser) {
        clearClientAuthState({ dispatchEvent: false })
      }
      return
    }

    if (userInfoResp.status !== 401) {
      if (storedUser) {
        clearClientAuthState({ dispatchEvent: false })
      }
      return
    }

    const refreshResp = await fetchWithTimeout(buildApiURL('/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    })

    if (!refreshResp.ok) {
      clearClientAuthState({ dispatchEvent: false })
      return
    }

    const verifyResp = await fetchWithTimeout(buildApiURL('/user/info'), {
      method: 'GET',
      credentials: 'include',
    })

    if (!verifyResp.ok) {
      clearClientAuthState({ dispatchEvent: false })
      return
    }

    const payload = await verifyResp.json().catch(() => null)
    const user = normalizeUser(payload)
    if (user) {
      setAuthenticatedUser(user, false)
      return
    }

    clearClientAuthState({ dispatchEvent: false })
  } catch (error) {
    console.warn('[Auth] startup session check failed', error)
    if (storedUser) {
      clearClientAuthState({ dispatchEvent: false })
    }
  }
}

export const ensureAuthReady = () => {
  if (!authReadyPromise) {
    authReadyPromise = verifyStartupSession()
  }
  return authReadyPromise
}
