import { ref } from 'vue'

export const aiAssistantOpen = ref(false)

const dispatchAIAssistantVisibilityChange = (state: 'open' | 'close' | 'toggle') => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(`ai-assistant-${state}`, {
    detail: { open: aiAssistantOpen.value },
  }))
}

export const openAIAssistant = () => {
  aiAssistantOpen.value = true
  dispatchAIAssistantVisibilityChange('open')
}

export const closeAIAssistant = () => {
  aiAssistantOpen.value = false
  dispatchAIAssistantVisibilityChange('close')
}

export const toggleAIAssistant = () => {
  aiAssistantOpen.value = !aiAssistantOpen.value
  dispatchAIAssistantVisibilityChange('toggle')
}
