import { ref, computed } from 'vue'

export type Language = 'en' | 'zh'

const LANGUAGE_PREFERENCE_KEY = 'language-preference'
const DEFAULT_LANGUAGE: Language = 'en'

const languagePreferenceState = ref<Language>(DEFAULT_LANGUAGE)

export const initLanguagePreference = () => {
  const stored = localStorage.getItem(LANGUAGE_PREFERENCE_KEY)
  if (stored && (stored === 'en' || stored === 'zh')) {
    languagePreferenceState.value = stored as Language
  } else {
    const browserLang = navigator.language?.split('-')[0] || ''
    languagePreferenceState.value = browserLang === 'zh' ? 'zh' : 'en'
  }
}

export const getLanguagePreference = (): Language => {
  return languagePreferenceState.value
}

export const setLanguagePreference = (language: Language): void => {
  if (language !== 'en' && language !== 'zh') {
    console.error(`Invalid language preference: ${language}, defaulting to English`)
    language = DEFAULT_LANGUAGE
  }
  languagePreferenceState.value = language
  localStorage.setItem(LANGUAGE_PREFERENCE_KEY, language)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('language-preference-changed', { detail: { language } }))
  }
}

export const useLanguagePreference = () => {
  return {
    language: computed(() => languagePreferenceState.value),
    setLanguage: setLanguagePreference,
  }
}
