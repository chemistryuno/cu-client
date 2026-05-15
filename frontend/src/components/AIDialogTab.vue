<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import { Bot, Send, Loader2 } from 'lucide-vue-next'
import { buildAssistantMessages, getStoredAIAssistantConfig, isAIAssistantConfigured, sendAIAssistantChat, getRateLimitStatus, RATE_LIMIT_CONFIG, type AIAssistantMessage } from '../utils/aiAssistant'
import { getGlobalGameContextForAI, formatGameContextForAIPrompt } from '../utils/gameContextForAI'
import { cn } from '../utils/cn'

const emit = defineEmits<{
  (e: 'switch-to-logs'): void
}>()

interface ConversationMessage extends AIAssistantMessage {
  id: number
  timestamp: number
}

const messages = ref<ConversationMessage[]>([])
const input = ref('')
const busy = ref(false)
const error = ref('')
const config = ref(getStoredAIAssistantConfig() as any)
const rateLimitStatus = ref(getRateLimitStatus(RATE_LIMIT_CONFIG))
const scrollContainer = ref<HTMLElement | null>(null)
const prefilledQuestion = ref('')

const configured = computed(() => isAIAssistantConfigured(config.value))
const canSend = computed(() => configured.value && input.value.trim().length > 0 && !busy.value && !rateLimitStatus.value.isLimited)

const systemPrompt = computed(() => [
  'You are a concise in-app chemistry game assistant for Chemistry Uno.',
  'Answer in the same language as the user if possible.',
  'Be short, practical, and grounded in the current game context.',
  'Focus on the specific game situation provided.'
].join(' '))

const refreshContext = async () => {
  config.value = await getStoredAIAssistantConfig()
  rateLimitStatus.value = getRateLimitStatus(RATE_LIMIT_CONFIG)
}

const scrollToBottom = () => {
  if (scrollContainer.value) {
    nextTick(() => {
      scrollContainer.value!.scrollTop = scrollContainer.value!.scrollHeight
    })
  }
}

const send = async () => {
  let prompt = input.value.trim()
  if (!prompt || !configured.value) return

  error.value = ''
  busy.value = true
  const nextId = Date.now()

  const conversation = messages.value.map(({ role, content }) => ({ role, content }))
  messages.value.push({ id: nextId, role: 'user', content: prompt, timestamp: Date.now() })
  input.value = ''
  prefilledQuestion.value = ''
  scrollToBottom()

  try {
    const gameContext = getGlobalGameContextForAI()
    const contextStr = formatGameContextForAIPrompt(gameContext)

    const reply = await sendAIAssistantChat({
      config: config.value,
      messages: buildAssistantMessages({
        systemPrompt: systemPrompt.value,
        context: {
          gameState: contextStr,
          gameHistory: gameContext.gameHistory.length > 0 ? 'Game has been played' : 'Game just started'
        } as any,
        conversation,
        userPrompt: prompt,
      }),
    })

    messages.value.push({ id: nextId + 1, role: 'assistant', content: reply.content, timestamp: Date.now() })
    rateLimitStatus.value = getRateLimitStatus(RATE_LIMIT_CONFIG)
    scrollToBottom()
  } catch (err: any) {
    error.value = err?.message || 'Assistant request failed / 助手请求失败'
  } finally {
    busy.value = false
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !busy.value) {
    e.preventDefault()
    send()
  }
}

const setPrefilledQuestion = (question: string) => {
  prefilledQuestion.value = question
  input.value = question
  nextTick(() => {
    const inputEl = document.querySelector('.ai-input') as HTMLTextAreaElement
    if (inputEl) {
      inputEl.focus()
      inputEl.setSelectionRange(0, 0)
    }
  })
}

watch(() => messages.value.length, () => {
  scrollToBottom()
})

// Expose method to parent to set prefilled question
defineExpose({
  setPrefilledQuestion
})

onMounted(() => {
  refreshContext()
  scrollToBottom()
})
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-transparent">
    <!-- Messages Container -->
    <div v-if="!configured" class="flex h-full flex-col items-center justify-center gap-3 p-4">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20">
        <Bot class="h-8 w-8 text-amber-600 dark:text-amber-400" />
      </div>
      <div class="text-center">
        <p class="text-xs-mobile font-black uppercase text-slate-700 dark:text-slate-300">
          AI Assistant Not Configured
        </p>
        <p class="mt-1 text-[9px] text-slate-500 dark:text-slate-400">
          Please set up your AI API in settings first.
        </p>
      </div>
    </div>

    <div v-else class="flex flex-1 flex-col overflow-hidden">
      <!-- Messages List -->
      <div
        ref="scrollContainer"
        class="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-3"
      >
        <div v-if="messages.length === 0" class="flex h-full flex-col items-center justify-center py-8 opacity-40">
          <Bot class="mb-2 h-8 w-8 text-sky-500" />
          <p class="text-[9px] font-black uppercase text-slate-500">
            Ask me anything / 有任何疑问吗？
          </p>
        </div>

        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="cn(
            'flex gap-2',
            msg.role === 'user' ? 'justify-end' : 'justify-start'
          )"
        >
          <div :class="cn(
            'flex max-w-[80%] flex-col gap-1',
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
            <span class="text-[7px] font-mono text-slate-400 dark:text-slate-500">
              {{ new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
            </span>
          </div>
        </div>

        <div v-if="busy" class="flex gap-2">
          <div class="flex items-center gap-2 rounded-2xl rounded-tl-md border border-slate-200/70 bg-slate-100 px-3 py-2 dark:border-white/10 dark:bg-white/[0.05]">
            <Loader2 class="h-4 w-4 animate-spin text-sky-500" />
            <span class="text-xs-mobile font-medium text-slate-600 dark:text-slate-400">
              AI thinking... / AI思考中...
            </span>
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="border-t border-slate-200/70 bg-red-50/50 px-3 py-2 text-[9px] text-red-600 dark:border-white/10 dark:bg-red-500/10 dark:text-red-400">
        ❌ {{ error }}
      </div>

      <!-- Rate Limit Status -->
      <div v-if="rateLimitStatus.isLimited" class="border-t border-slate-200/70 bg-amber-50/50 px-3 py-2 dark:border-white/10 dark:bg-amber-500/10">
        <p class="text-[9px] font-bold text-amber-700 dark:text-amber-400">
          ⏱️ Rate Limited / 请求过于频繁
        </p>
        <p class="text-[8px] text-amber-600 dark:text-amber-400/80">
          Retry in {{ Math.ceil(rateLimitStatus.resetIn / 1000) }}s / 请在 {{ Math.ceil(rateLimitStatus.resetIn / 1000) }} 秒后重试
        </p>
      </div>

      <div v-else class="border-t border-slate-200/70 bg-sky-50/50 px-3 py-1.5 dark:border-white/10 dark:bg-sky-500/5">
        <p class="text-[8px] font-mono text-sky-600 dark:text-sky-400">
          Requests: {{ rateLimitStatus.remaining }} / {{ RATE_LIMIT_CONFIG.maxRequests }} remaining
        </p>
      </div>

      <!-- Input Area -->
      <div class="shrink-0 space-y-2 border-t border-slate-200/70 bg-white/88 p-3 pb-4 dark:border-white/10 dark:bg-[#0e1722]/85">
        <div class="flex gap-2">
          <div class="group relative flex-1">
            <div class="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-sky-500/25 to-cyan-500/25 blur opacity-0 transition duration-300 group-focus-within:opacity-100"></div>
            <textarea
              class="ai-input relative h-11 w-full resize-none rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition-all focus:border-sky-500/40 focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-slate-500"
              v-model="input"
              :placeholder="prefilledQuestion ? '' : 'Ask for strategy tips... / 询问策略建议...'"
              @keydown="handleKeyDown"
            />
          </div>
          <button
            @click="send"
            :disabled="!canSend"
            class="btn-touch touch-feedback group/send flex shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-900/15 transition-all hover:bg-sky-500 disabled:opacity-50 disabled:grayscale"
          >
            <Send v-if="!busy" class="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:h-3.5 sm:w-3.5" />
            <Loader2 v-else class="h-4 w-4 animate-spin sm:h-3.5 sm:w-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.5) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.5);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(148, 163, 184, 0.7);
}

textarea {
  resize: vertical;
  max-height: 100px;
  min-height: 44px;
}
</style>
