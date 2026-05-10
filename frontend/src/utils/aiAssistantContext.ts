import { computed, ref } from 'vue'
import type { AIAssistantContext } from './aiAssistant'

const currentContext = ref<AIAssistantContext>({
  surface: 'lobby',
  title: 'Local Lobby',
  summary: 'No assistant context has been set yet.',
  hints: [],
})

export const useAIAssistantContext = () => {
  const context = computed(() => currentContext.value)

  const setContext = (next: AIAssistantContext) => {
    currentContext.value = {
      surface: next.surface,
      title: next.title,
      summary: next.summary,
      hints: next.hints || [],
    }
  }

  return {
    context,
    setContext,
  }
}

export const setGlobalAIAssistantContext = (next: AIAssistantContext) => {
  currentContext.value = {
    surface: next.surface,
    title: next.title,
    summary: next.summary,
    hints: next.hints || [],
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ai-assistant-context-changed'))
  }
}

export const getGlobalAIAssistantContext = () => currentContext.value
