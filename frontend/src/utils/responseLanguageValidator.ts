import { Language } from './languagePreference'

const ENGLISH_PATTERN = /[a-zA-Z]{3,}/
const CHINESE_PATTERN = /[一-龥]/

export const detectLanguageInText = (text: string): Language | 'mixed' | 'unknown' => {
  const hasEnglish = ENGLISH_PATTERN.test(text)
  const hasChinese = CHINESE_PATTERN.test(text)

  if (hasEnglish && hasChinese) {
    return 'mixed'
  }
  if (hasChinese) {
    return 'zh'
  }
  if (hasEnglish) {
    return 'en'
  }
  return 'unknown'
}

export const validateResponseLanguage = (response: string, expectedLanguage: Language): {
  isValid: boolean
  detectedLanguage: Language | 'mixed' | 'unknown'
  issues: string[]
} => {
  const detected = detectLanguageInText(response)
  const issues: string[] = []

  if (detected === 'mixed') {
    issues.push(`Response contains mixed languages (expected ${expectedLanguage} only)`)
  } else if (detected !== 'unknown' && detected !== expectedLanguage) {
    issues.push(`Response is in ${detected}, but user language is ${expectedLanguage}`)
  }

  return {
    isValid: issues.length === 0,
    detectedLanguage: detected,
    issues,
  }
}

export const logLanguageValidationIssue = (response: string, expectedLanguage: Language, validation: ReturnType<typeof validateResponseLanguage>) => {
  if (!validation.isValid) {
    console.warn('[AILanguageValidation]', {
      expectedLanguage,
      detectedLanguage: validation.detectedLanguage,
      issues: validation.issues,
      responsePreview: response.slice(0, 100),
    })
  }
}
