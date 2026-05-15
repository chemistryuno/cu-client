<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { Bot, Loader2, Send, AlertCircle, Sparkles } from 'lucide-vue-next'
import { buildAssistantMessages, getStoredAIAssistantConfig, isAIAssistantConfigured, sendAIAssistantChat, type AIAssistantMessage, getRateLimitStatus, RATE_LIMIT_CONFIG } from '../utils/aiAssistant'
import { formatGameContextForAIPrompt } from '../utils/gameContextForAI'
import type { GameLogEntry, GameContextForAI } from '../types/gameLog'
import { cn } from '../utils/cn'
import { getLanguagePreference, initLanguagePreference } from '../utils/languagePreference'
import { buildSystemPrompt } from '../utils/systemPromptBuilder'
import { validateResponseLanguage, logLanguageValidationIssue } from '../utils/responseLanguageValidator'

const props = defineProps<{
  gameLogs: GameLogEntry[]
  currentGameContext: GameContextForAI
  maxHeight?: string
  roomId?: string
  isMultiplayer?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const input = ref('')
const busy = ref(false)
const error = ref('')
const messages = ref<Array<AIAssistantMessage & { id: number }>>([])
const config = ref(getStoredAIAssistantConfig() as any)
const scrollContainer = ref<HTMLElement | null>(null)
const rateLimitStatus = ref(getRateLimitStatus(RATE_LIMIT_CONFIG))
const userLanguage = ref(getLanguagePreference())

const configured = computed(() => isAIAssistantConfigured(config.value))
const contextReady = computed(() => props.currentGameContext && props.currentGameContext.playerState?.hand !== undefined)
const canSend = computed(() => {
  if (!isAIAssistantConfigured(config.value)) return false
  if (!input.value.trim().length) return false
  if (busy.value) return false
  if (rateLimitStatus.value.isLimited) return false

  // Single-player requires context ready; multiplayer doesn't
  if (props.isMultiplayer) return true
  return contextReady.value
})

const systemPrompt = computed(() => {
  const gameContext = props.currentGameContext && props.currentGameContext.playerState?.hand !== undefined
    ? formatGameContextForAIPrompt(props.currentGameContext)
    : undefined

  return buildSystemPrompt(userLanguage.value, {
    isMultiplayer: props.isMultiplayer,
    gameContext,
  })
})

const scrollToBottom = () => {
  if (scrollContainer.value) {
    nextTick(() => {
      scrollContainer.value!.scrollTop = scrollContainer.value!.scrollHeight
    })
  }
}

const refreshConfig = async () => {
  config.value = await getStoredAIAssistantConfig()
  rateLimitStatus.value = getRateLimitStatus(RATE_LIMIT_CONFIG)
}

const send = async () => {
  const prompt = input.value.trim()
  if (!prompt || !isAIAssistantConfigured(config.value)) return

  // For single-player, require context ready; for multiplayer, always allow
  if (!props.isMultiplayer && !contextReady.value) return

  error.value = ''
  busy.value = true
  const nextId = Date.now()
  const conversation = messages.value.map(({ role, content }) => ({ role, content }))
  messages.value.push({ id: nextId, role: 'user', content: prompt })
  input.value = ''
  scrollToBottom()

  try {
    const reply = await sendAIAssistantChat({
      config: config.value,
      messages: buildAssistantMessages({
        systemPrompt: systemPrompt.value,
        context: { surface: 'room' as const, title: 'In-Game Assistant', summary: 'Helping with current game' },
        conversation,
        userPrompt: prompt,
      }),
      language: userLanguage.value,
    })
    const validation = validateResponseLanguage(reply.content, userLanguage.value)
    logLanguageValidationIssue(reply.content, userLanguage.value, validation)
    messages.value.push({ id: nextId + 1, role: 'assistant', content: reply.content })
    rateLimitStatus.value = getRateLimitStatus(RATE_LIMIT_CONFIG)
    scrollToBottom()
  } catch (err: any) {
    error.value = err?.message || 'Assistant request failed / 助手请求失败'
    messages.value.pop()
  } finally {
    busy.value = false
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !busy.value && canSend.value) {
    send()
  }
}

onMounted(() => {
  initLanguagePreference()
  userLanguage.value = getLanguagePreference()
  refreshConfig()
  window.addEventListener('ai-assistant-config-changed', () => refreshConfig())
  window.addEventListener('language-preference-changed', (e: any) => {
    userLanguage.value = e.detail?.language || getLanguagePreference()
  })
})

onUnmounted(() => {
  window.removeEventListener('ai-assistant-config-changed', () => refreshConfig())
  window.removeEventListener('language-preference-changed', ((e: any) => {
    userLanguage.value = e.detail?.language || getLanguagePreference()
  }))
})

watch(() => props.currentGameContext, () => {
  // System prompt will reactively update via computed property
}, { deep: true })
</script>

<template>
  <div
    :class="cn('console-card flex flex-col overflow-hidden backdrop-blur', $attrs.class as string)"
    :style="maxHeight ? { height: maxHeight } : {}"
  >
    <div class="flex shrink-0 items-center justify-between border-b border-slate-200/70 bg-slate-50/60 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/15 bg-cyan-500/10">
          <Bot class="h-4 w-4 text-cyan-500" />
        </div>
        <div>
          <h3 class="text-xs-mobile font-black uppercase tracking-widest text-slate-800 dark:text-white">AI 游戏助手 / Game Assistant</h3>
          <p class="text-[9px] font-mono uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Strategy Guide / 策略指导</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div :class="cn(
          'console-notice-chip',
          isMultiplayer || contextReady ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500'
        )">
          <span :class="cn(
            'h-1 w-1 rounded-full',
            isMultiplayer || contextReady ? 'bg-cyan-500' : 'bg-slate-500'
          )"></span>
          {{ isMultiplayer ? '就绪 / Ready' : (contextReady ? '就绪 / Ready' : '初始化中... / Initializing...') }}
        </div>
      </div>
    </div>

    <div
      ref="scrollContainer"
      class="custom-scrollbar flex-1 space-y-2 overflow-y-auto bg-transparent p-3"
    >
      <div v-if="messages.length === 0 && contextReady" class="flex h-full flex-col items-center justify-center py-10 opacity-20">
        <div class="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 dark:bg-white/10">
          <Bot class="h-7 w-7" />
        </div>
        <p class="text-xs-mobile font-black uppercase tracking-widest text-slate-500">提出问题开始对话 / Ask a question to begin</p>
      </div>

      <div v-if="!contextReady" class="flex h-full flex-col items-center justify-center py-10">
        <div class="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-200 dark:bg-cyan-500/20 animate-pulse">
          <Bot class="h-7 w-7 text-cyan-600 dark:text-cyan-400" />
        </div>
        <p class="text-xs-mobile font-black uppercase tracking-widest text-slate-500">初始化游戏上下文... / Initializing game context...</p>
        <p class="text-[9px] text-slate-400 dark:text-slate-500 mt-2">等待游戏状态更新 / Waiting for game state</p>
      </div>

      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        :class="cn(
          'w-full flex',
          msg.role === 'user' ? 'justify-end' : 'justify-start'
        )"
      >
        <div :class="cn(
          'flex max-w-[85%] flex-col gap-0.5',
          msg.role === 'user' ? 'items-end' : 'items-start'
        )">
          <div :class="cn(
            'break-words rounded-2xl px-3 py-2 text-xs-mobile font-medium leading-relaxed shadow-sm',
            msg.role === 'user'
              ? 'rounded-tr-md bg-sky-600 text-white'
              : 'rounded-tl-md border border-slate-200/70 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-200'
          )">
            {{ msg.content }}
          </div>
        </div>
      </div>
    </div>

    <div class="shrink-0 space-y-2 border-t border-slate-200/70 bg-white/88 p-3 pb-4 dark:border-white/10 dark:bg-[#0e1722]/85">
      <div v-if="error" class="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-300 flex items-start gap-2">
        <AlertCircle class="h-4 w-4 mt-0.5 shrink-0" />
        <div class="min-w-0">
          <p class="break-words">{{ error }}</p>
          <p class="text-[11px] opacity-80 mt-1">点击输入重试 / Click input to retry</p>
        </div>
      </div>

      <div v-if="rateLimitStatus.isLimited" class="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-200">
        <div class="mb-1">请稍候 / Rate Limited</div>
        <div class="text-[11px] opacity-80">重试倒计时: {{ Math.ceil(rateLimitStatus.resetIn / 1000) }}s / Retry in {{ Math.ceil(rateLimitStatus.resetIn / 1000) }}s</div>
      </div>

      <div v-if="configured && !rateLimitStatus.isLimited && contextReady" class="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3 py-2 text-[11px] font-bold text-slate-600 dark:text-slate-400">
        <div class="flex items-center gap-1.5">
          <Sparkles class="h-3.5 w-3.5" />
          请求: {{ rateLimitStatus.remaining }} / {{ RATE_LIMIT_CONFIG.maxRequests }}
        </div>
      </div>

      <div v-if="!configured" class="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-200">
        AI 助手未配置 / AI assistant is not configured. 请在个人资料设置中添加 API 配置 / Add API configuration in profile settings.
      </div>

      <div class="flex gap-2">
        <div class="group relative flex-1">
          <div class="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-cyan-500/25 to-blue-500/25 blur opacity-0 transition duration-300 group-focus-within:opacity-100"></div>
          <input
            v-model="input"
            type="text"
            placeholder="问助手任何问题... / Ask anything..."
            class="relative h-11 w-full rounded-2xl border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-800 transition-all focus:border-cyan-500/40 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500"
            @keydown="handleKeyDown"
            :disabled="!configured || (!isMultiplayer && !contextReady)"
          />
        </div>
        <button
          @click="send"
          :disabled="!canSend"
          class="btn-touch touch-feedback group/send flex shrink-0 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-900/15 transition-all hover:bg-cyan-500 disabled:opacity-50 disabled:grayscale"
          :title="!configured ? 'AI 未配置 / Not configured' : (!isMultiplayer && !contextReady) ? '初始化中 / Initializing' : '发送 / Send'"
        >
          <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
          <Send v-else class="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
