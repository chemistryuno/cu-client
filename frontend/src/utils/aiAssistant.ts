import { computed, ref } from 'vue'
import { CLIENT_RUNTIME_STORAGE_KEYS, clientRuntimeStorage } from './clientRuntimeStorage'
import { encryptText, decryptText, isEncrypted } from './aiEncryption'
import { isRateLimited, recordRequest, getRateLimitStatus, RATE_LIMIT_CONFIG } from './aiRateLimit'

export type AIAssistantConfig = {
  baseUrl: string
  apiKey: string
  model: string
}

export type AIAssistantMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AIAssistantContext = {
  surface: 'lobby' | 'room'
  title: string
  summary: string
  hints?: string[]
}

export type AIAssistantReply = {
  content: string
  raw: any
}

// DeepSeek API配置
export const DEFAULT_AI_ASSISTANT_CONFIG: AIAssistantConfig = {
  baseUrl: 'https://api.deepseek.com',
  apiKey: 'sk-2339cb1123884da6b6baa4d2ec7f7b3e',
  model: 'deepseek-chat',
}

const CONFIG_STORAGE_KEY = CLIENT_RUNTIME_STORAGE_KEYS.aiAssistantConfig
const aiAssistantConfigState = ref<AIAssistantConfig>({ ...DEFAULT_AI_ASSISTANT_CONFIG })

const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, '')

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const normalizeConfig = (config: Partial<AIAssistantConfig> | null | undefined): AIAssistantConfig => ({
  baseUrl: normalizeBaseUrl(String(config?.baseUrl || '')),
  apiKey: String(config?.apiKey || '').trim(),
  model: String(config?.model || '').trim(),
})

export const getStoredAIAssistantConfig = async (): Promise<AIAssistantConfig> => {
  const stored = safeParse(clientRuntimeStorage.getItem(CONFIG_STORAGE_KEY), DEFAULT_AI_ASSISTANT_CONFIG)
  const normalized = normalizeConfig(stored)

  // 如果API密钥是加密的，尝试解密
  if (isEncrypted(normalized.apiKey)) {
    try {
      normalized.apiKey = await decryptText(normalized.apiKey)
    } catch (error) {
      console.error('Failed to decrypt API key:', error)
      normalized.apiKey = ''
    }
  }

  return normalized
}

aiAssistantConfigState.value = getStoredAIAssistantConfig() as any

export const setStoredAIAssistantConfig = async (config: Partial<AIAssistantConfig>) => {
  const next = normalizeConfig(config)

  // 对API密钥进行加密存储
  const encryptedApiKey = await encryptText(next.apiKey)
  const encryptedConfig = {
    ...next,
    apiKey: encryptedApiKey,
  }

  clientRuntimeStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(encryptedConfig))
  aiAssistantConfigState.value = next
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai-assistant-config-changed'))
  }
  return next
}

export const clearStoredAIAssistantConfig = () => {
  clientRuntimeStorage.removeItem(CONFIG_STORAGE_KEY)
  aiAssistantConfigState.value = { ...DEFAULT_AI_ASSISTANT_CONFIG }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai-assistant-config-changed'))
  }
}

export const useAIAssistantConfig = () => {
  const config = computed(() => aiAssistantConfigState.value)
  return {
    config,
    setConfig: setStoredAIAssistantConfig,
    clearConfig: clearStoredAIAssistantConfig,
  }
}

export const isAIAssistantConfigured = (config: Partial<AIAssistantConfig>) => {
  const normalized = normalizeConfig(config)
  return Boolean(normalized.baseUrl && normalized.apiKey && normalized.model)
}

const stripBaseUrlTrailingSlash = (baseUrl: string) => baseUrl.replace(/\/+$/, '')

const buildChatCompletionsURL = (baseUrl: string) => {
  const normalized = stripBaseUrlTrailingSlash(baseUrl)
  return normalized.endsWith('/v1') ? `${normalized}/chat/completions` : `${normalized}/v1/chat/completions`
}

const extractAssistantContent = (payload: any) => {
  const direct = payload?.choices?.[0]?.message?.content
  if (typeof direct === 'string' && direct.trim()) return direct.trim()

  const text = payload?.choices?.[0]?.text
  if (typeof text === 'string' && text.trim()) return text.trim()

  const message = payload?.message?.content
  if (typeof message === 'string' && message.trim()) return message.trim()

  return ''
}

export const sendAIAssistantChat = async ({
  config,
  messages,
  signal,
  timeoutMs = 30000,
}: {
  config: AIAssistantConfig
  messages: AIAssistantMessage[]
  signal?: AbortSignal
  timeoutMs?: number
}): Promise<AIAssistantReply> => {
  const normalized = normalizeConfig(config)
  if (!isAIAssistantConfigured(normalized)) {
    throw new Error('AI assistant is not configured')
  }

  // 检查速率限制
  if (isRateLimited(RATE_LIMIT_CONFIG)) {
    const status = getRateLimitStatus(RATE_LIMIT_CONFIG)
    const resetSeconds = Math.ceil(status.resetIn / 1000)
    throw new Error(
      `请求过于频繁，请在 ${resetSeconds} 秒后再试 / Too many requests, please try again in ${resetSeconds} seconds`
    )
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  signal?.addEventListener('abort', () => controller.abort(), { once: true })

  let resp: Response
  try {
    resp = await fetch(buildChatCompletionsURL(normalized.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${normalized.apiKey}`,
      },
      body: JSON.stringify({
        model: normalized.model,
        messages,
        temperature: 0.7,
      }),
      signal: controller.signal,
    })

    // 请求成功后，记录这次请求
    recordRequest()
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('AI request timed out')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }

  const payload = await resp.json().catch(() => null)
  if (!resp.ok) {
    const message = String(payload?.error?.message || payload?.error || `AI request failed (${resp.status})`)
    throw new Error(message)
  }

  const content = extractAssistantContent(payload)
  if (!content) {
    throw new Error('AI provider returned an empty response')
  }

  return {
    content,
    raw: payload,
  }
}

export const buildAssistantMessages = ({
  systemPrompt,
  context,
  conversation,
  userPrompt,
}: {
  systemPrompt: string
  context: AIAssistantContext
  conversation: AIAssistantMessage[]
  userPrompt: string
}): AIAssistantMessage[] => {
  const contextLines = [
    `Surface: ${context.surface}`,
    `Title: ${context.title}`,
    `Summary: ${context.summary}`,
    ...(context.hints?.length ? [`Hints: ${context.hints.join(' | ')}`] : []),
  ]

  return [
    { role: 'system', content: `${systemPrompt}\n\n${contextLines.join('\n')}` },
    ...conversation,
    { role: 'user', content: userPrompt },
  ]
}

// 导出速率限制相关的函数
export { getRateLimitStatus, getRemainingRequests, RATE_LIMIT_CONFIG } from './aiRateLimit'
