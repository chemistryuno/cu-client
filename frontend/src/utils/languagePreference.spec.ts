import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getLanguagePreference, setLanguagePreference, initLanguagePreference, Language } from './languagePreference'

describe('languagePreference', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('getLanguagePreference', () => {
    it('should return stored language preference', () => {
      localStorage.setItem('language-preference', 'zh')
      initLanguagePreference()
      expect(getLanguagePreference()).toBe('zh')
    })

    it('should default to English when no preference is stored', () => {
      initLanguagePreference()
      expect(getLanguagePreference()).toBe('en')
    })

    it('should fall back to Chinese for zh browser locale', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'zh-CN',
        writable: true,
        configurable: true,
      })
      localStorage.clear()
      initLanguagePreference()
      expect(getLanguagePreference()).toBe('zh')
    })

    it('should default to English for non-Chinese browser locale', () => {
      Object.defineProperty(navigator, 'language', {
        value: 'en-US',
        writable: true,
        configurable: true,
      })
      localStorage.clear()
      initLanguagePreference()
      expect(getLanguagePreference()).toBe('en')
    })
  })

  describe('setLanguagePreference', () => {
    it('should set language preference to Chinese', () => {
      setLanguagePreference('zh')
      expect(getLanguagePreference()).toBe('zh')
      expect(localStorage.getItem('language-preference')).toBe('zh')
    })

    it('should set language preference to English', () => {
      setLanguagePreference('en')
      expect(getLanguagePreference()).toBe('en')
      expect(localStorage.getItem('language-preference')).toBe('en')
    })

    it('should dispatch language-preference-changed event', () => {
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent')
      setLanguagePreference('zh')
      expect(dispatchEventSpy).toHaveBeenCalled()
      const event = dispatchEventSpy.mock.calls[0][0] as CustomEvent
      expect(event.type).toBe('language-preference-changed')
      expect(event.detail.language).toBe('zh')
    })

    it('should default to English for invalid language', () => {
      setLanguagePreference('fr' as Language)
      expect(getLanguagePreference()).toBe('en')
    })

    it('should persist language preference across calls', () => {
      setLanguagePreference('zh')
      expect(localStorage.getItem('language-preference')).toBe('zh')

      initLanguagePreference()
      expect(getLanguagePreference()).toBe('zh')
    })
  })
})
