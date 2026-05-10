<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Bot, Loader2, Send, X, Globe, KeyRound, LibraryBig, Sparkles } from 'lucide-vue-next'
import { buildAssistantMessages, getStoredAIAssistantConfig, isAIAssistantConfigured, sendAIAssistantChat, type AIAssistantContext, type AIAssistantMessage } from '../utils/aiAssistant'
import { getGlobalAIAssistantContext } from '../utils/aiAssistantContext'

const props = defineProps<{
  open?: boolean
  title?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const visible = ref(Boolean(props.open))
const input = ref('')
const busy = ref(false)
const error = ref('')
const messages = ref<Array<AIAssistantMessage & { id: number }>>([])
const config = ref(getStoredAIAssistantConfig())
const context = ref<AIAssistantContext>(getGlobalAIAssistantContext())

const configured = computed(() => isAIAssistantConfigured(config.value))
const canSend = computed(() => isAIAssistantConfigured(config.value) && input.value.trim().length > 0 && !busy.value)

const systemPrompt = computed(() => [
  'You are a concise in-app chemistry game assistant.',
  'Answer in the same language as the user if possible.',
  'Be short, practical, and grounded in the current app context.',
].join(' '))

const refreshContext = () => {
  context.value = getGlobalAIAssistantContext()
  config.value = getStoredAIAssistantConfig()
}

const close = () => {
  visible.value = false
  emit('close')
}

const send = async () => {
  const prompt = input.value.trim()
  if (!prompt || !isAIAssistantConfigured(config.value)) return

  error.value = ''
  busy.value = true
  const nextId = Date.now()
  const conversation = messages.value.map(({ role, content }) => ({ role, content }))
  messages.value.push({ id: nextId, role: 'user', content: prompt })
  input.value = ''

  try {
    const reply = await sendAIAssistantChat({
      config: config.value,
      messages: buildAssistantMessages({
        systemPrompt: systemPrompt.value,
        context: context.value,
        conversation,
        userPrompt: prompt,
      }),
    })
    messages.value.push({ id: nextId + 1, role: 'assistant', content: reply.content })
  } catch (err: any) {
    error.value = err?.message || 'Assistant request failed'
  } finally {
    busy.value = false
  }
}

watch(() => props.open, (next) => {
  visible.value = Boolean(next)
  if (next) {
    refreshContext()
  }
}, { immediate: true })

onMounted(() => {
  refreshContext()
  window.addEventListener('ai-assistant-context-changed', refreshContext as EventListener)
  window.addEventListener('ai-assistant-config-changed', refreshContext as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('ai-assistant-context-changed', refreshContext as EventListener)
  window.removeEventListener('ai-assistant-config-changed', refreshContext as EventListener)
})

watch(visible, (next) => {
  if (next) refreshContext()
})
</script>

<template>
  <transition name="assistant-panel">
    <div v-if="visible" class="fixed inset-0 z-[120] flex items-end justify-end p-4 pointer-events-none">
      <div class="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d1219] shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-4 py-3">
          <div class="flex items-center gap-2">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
              <Bot class="h-4 w-4" />
            </div>
            <div>
              <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">AI Assistant</p>
              <h3 class="text-sm font-black text-slate-900 dark:text-white">{{ title || context.title }}</h3>
            </div>
          </div>
          <button type="button" class="console-button console-button-ghost p-2" @click="close">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="space-y-3 px-4 py-3">
          <div class="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3 text-[11px] text-slate-600 dark:text-slate-300">
            <div class="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <Sparkles class="h-3.5 w-3.5" />
              Context
            </div>
            <p class="mb-2 font-bold text-slate-900 dark:text-white">{{ context.summary }}</p>
            <div class="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
              <span class="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-1 text-cyan-600 dark:text-cyan-300">
                <Globe class="h-3 w-3" />
                {{ config.baseUrl || 'No Base URL' }}
              </span>
              <span class="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-2 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                <KeyRound class="h-3 w-3" />
                {{ config.apiKey ? 'API Key set' : 'No API Key' }}
              </span>
              <span class="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-2 py-1 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                <LibraryBig class="h-3 w-3" />
                {{ config.model || 'No model' }}
              </span>
            </div>
          </div>

          <div class="max-h-72 space-y-2 overflow-y-auto pr-1">
            <div
              v-for="item in messages"
              :key="item.id"
              :class="[
                'rounded-2xl px-3 py-2 text-sm leading-relaxed',
                item.role === 'user'
                  ? 'ml-8 bg-sky-600 text-white'
                  : 'mr-8 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-800 dark:text-slate-100',
              ]"
            >
              {{ item.content }}
            </div>
          </div>

          <div v-if="error" class="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-300">
            {{ error }}
          </div>

          <div v-if="!configured" class="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-200">
            AI assistant is not configured. Add an API Base URL, API Key, and model in profile settings.
          </div>

          <div class="flex gap-2">
            <input
              v-model="input"
              data-testid="ai-assistant-input"
              type="text"
              class="min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-cyan-500"
              placeholder="Ask the assistant..."
              @keydown.enter.prevent="send"
            />
            <button
              type="button"
              data-testid="ai-assistant-send-button"
              :disabled="!canSend"
              class="console-button console-button-primary px-4"
              @click="send"
            >
              <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
              <Send v-else class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.assistant-panel-enter-active,
.assistant-panel-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.assistant-panel-enter-from,
.assistant-panel-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
