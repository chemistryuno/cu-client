/**
 * 请求速率限制工具
 * 限制用户的AI助手请求速率
 */

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitEntry {
  timestamps: number[]
  blocked: boolean
  blockUntil?: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1分钟
}

export const RATE_LIMIT_CONFIG = DEFAULT_CONFIG

const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * 获取用户的速率限制键
 */
function getUserKey(): string {
  if (typeof window === 'undefined') {
    return 'anonymous'
  }

  try {
    const userData = JSON.parse(localStorage.getItem('user') || '{}')
    return `user_${userData.uid || userData.id || 'anonymous'}`
  } catch {
    return 'anonymous'
  }
}

/**
 * 清理过期的时间戳
 */
function cleanupOldTimestamps(
  entry: RateLimitEntry,
  windowMs: number,
  now: number
): void {
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs)
}

/**
 * 检查是否被限制
 */
function isBlocked(entry: RateLimitEntry, now: number): boolean {
  if (!entry.blocked || !entry.blockUntil) {
    return false
  }
  if (now >= entry.blockUntil) {
    entry.blocked = false
    entry.blockUntil = undefined
    entry.timestamps = []
    return false
  }
  return true
}

/**
 * 检查是否超过限制
 */
export function isRateLimited(config = DEFAULT_CONFIG): boolean {
  const now = Date.now()
  const key = getUserKey()

  let entry = rateLimitStore.get(key)
  if (!entry) {
    entry = { timestamps: [], blocked: false }
    rateLimitStore.set(key, entry)
  }

  if (isBlocked(entry, now)) {
    return true
  }

  cleanupOldTimestamps(entry, config.windowMs, now)

  if (entry.timestamps.length >= config.maxRequests) {
    entry.blocked = true
    entry.blockUntil = now + config.windowMs * 2
    return true
  }

  return false
}

/**
 * 记录请求
 */
export function recordRequest(): void {
  const now = Date.now()
  const key = getUserKey()

  let entry = rateLimitStore.get(key)
  if (!entry) {
    entry = { timestamps: [], blocked: false }
    rateLimitStore.set(key, entry)
  }

  entry.timestamps.push(now)
}

/**
 * 获取剩余请求次数
 */
export function getRemainingRequests(config = DEFAULT_CONFIG): number {
  const now = Date.now()
  const key = getUserKey()

  let entry = rateLimitStore.get(key)
  if (!entry) {
    return config.maxRequests
  }

  cleanupOldTimestamps(entry, config.windowMs, now)
  return Math.max(0, config.maxRequests - entry.timestamps.length)
}

/**
 * 获取重置时间（毫秒）
 */
export function getResetTime(config = DEFAULT_CONFIG): number {
  const now = Date.now()
  const key = getUserKey()

  let entry = rateLimitStore.get(key)
  if (!entry || entry.timestamps.length === 0) {
    return 0
  }

  const oldestTimestamp = entry.timestamps[0]
  const resetTime = oldestTimestamp + config.windowMs
  return Math.max(0, resetTime - now)
}

/**
 * 清除用户的速率限制记录
 */
export function clearUserRateLimit(): void {
  const key = getUserKey()
  rateLimitStore.delete(key)
}

/**
 * 获取速率限制状态
 */
export function getRateLimitStatus(config = DEFAULT_CONFIG): {
  isLimited: boolean
  remaining: number
  resetIn: number
  blocked: boolean
} {
  const now = Date.now()
  const key = getUserKey()

  let entry = rateLimitStore.get(key)
  if (!entry) {
    return {
      isLimited: false,
      remaining: config.maxRequests,
      resetIn: 0,
      blocked: false,
    }
  }

  const blocked = isBlocked(entry, now)
  if (blocked) {
    return {
      isLimited: true,
      remaining: 0,
      resetIn: Math.max(0, (entry.blockUntil || 0) - now),
      blocked: true,
    }
  }

  cleanupOldTimestamps(entry, config.windowMs, now)

  const isLimited = entry.timestamps.length >= config.maxRequests
  const remaining = Math.max(0, config.maxRequests - entry.timestamps.length)
  const resetIn = entry.timestamps.length > 0
    ? Math.max(0, entry.timestamps[0] + config.windowMs - now)
    : 0

  return {
    isLimited,
    remaining,
    resetIn,
    blocked: false,
  }
}
