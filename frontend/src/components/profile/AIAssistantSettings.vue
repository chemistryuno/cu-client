<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Bot, Globe, KeyRound, LibraryBig, Eye, EyeOff, Save, RotateCcw } from 'lucide-vue-next'
import { useDialog } from '../../utils/dialog'
import {
  DEFAULT_AI_ASSISTANT_CONFIG,
  getStoredAIAssistantConfig,
  isAIAssistantConfigured,
  setStoredAIAssistantConfig,
  type AIAssistantConfig,
} from '../../utils/aiAssistant'

const { showAlert } = useDialog()
const showApiKey = ref(false)
const aiConfig = ref<AIAssistantConfig>(getStoredAIAssistantConfig())
const error = ref('')

const configured = computed(() => isAIAssistantConfigured(aiConfig.value))

const resetToEmpty = () => {
  aiConfig.value = { ...DEFAULT_AI_ASSISTANT_CONFIG }
  error.value = ''
}

const saveConfig = () => {
  error.value = ''
  const baseUrl = String(aiConfig.value.baseUrl || '').trim()
  const apiKey = String(aiConfig.value.apiKey || '').trim()
  const model = String(aiConfig.value.model || '').trim()

  if ((baseUrl || apiKey || model) && (!baseUrl || !apiKey || !model)) {
    error.value = '请填写完整的 AI 配置 / Complete the AI configuration'
    return
  }

  if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
    error.value = 'API Base URL 必须以 http:// 或 https:// 开头'
    return
  }

  aiConfig.value = setStoredAIAssistantConfig({ baseUrl, apiKey, model })
  showAlert('AI 助手设置已保存 / AI assistant settings saved', '保存成功')
}

watch(aiConfig, (nextValue) => {
  if (!nextValue.baseUrl && !nextValue.apiKey && !nextValue.model) {
    error.value = ''
  }
}, { deep: true })
</script>

<template>
  <div class="bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm dark:shadow-none transition-all">
    <h3 class="text-base font-black uppercase tracking-widest mb-5 flex items-center gap-2.5 text-slate-800 dark:text-white">
      <Bot class="w-4 h-4 text-cyan-500" />
      AI Assistant <span class="text-[10px] font-mono opacity-30">/ CUSTOM MODEL</span>
    </h3>

    <div class="space-y-4">
      <label class="space-y-1.5 block">
        <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <Globe class="w-3.5 h-3.5" />
          API Base URL
        </div>
        <input
          v-model="aiConfig.baseUrl"
          data-testid="ai-base-url-input"
          type="url"
          placeholder="https://api.openai.com/v1"
          class="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-cyan-500"
        />
      </label>

      <label class="space-y-1.5 block">
        <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <KeyRound class="w-3.5 h-3.5" />
          API Key
        </div>
        <div class="flex gap-2">
          <input
            v-model="aiConfig.apiKey"
            data-testid="ai-api-key-input"
            :type="showApiKey ? 'text' : 'password'"
            placeholder="sk-..."
            class="min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-cyan-500"
          />
          <button type="button" @click="showApiKey = !showApiKey" class="console-button console-button-ghost px-3">
            <Eye v-if="!showApiKey" class="w-4 h-4" />
            <EyeOff v-else class="w-4 h-4" />
          </button>
        </div>
      </label>

      <label class="space-y-1.5 block">
        <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
          <LibraryBig class="w-3.5 h-3.5" />
          Model
        </div>
        <input
          v-model="aiConfig.model"
          data-testid="ai-model-input"
          type="text"
          placeholder="gpt-4o-mini"
          class="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-cyan-500"
        />
      </label>

      <div class="flex items-center justify-between gap-3">
        <span class="text-[10px] font-black uppercase tracking-widest" :class="configured ? 'text-emerald-600' : 'text-slate-400'">
          {{ configured ? 'Configured' : 'Not configured' }}
        </span>
        <div class="flex items-center gap-2">
          <button type="button" @click="resetToEmpty" class="console-button console-button-ghost px-3">
            <RotateCcw class="w-4 h-4" />
          </button>
          <button
            type="button"
            data-testid="ai-config-save-button"
            @click="saveConfig"
            class="console-button console-button-primary px-4"
          >
            <Save class="w-4 h-4" />
            Save AI Config
          </button>
        </div>
      </div>

      <div v-if="error" class="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-300">
        {{ error }}
      </div>
    </div>
  </div>
</template>
