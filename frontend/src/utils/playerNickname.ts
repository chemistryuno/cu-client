export const MAX_NICKNAME_LENGTH = 20
export const NICKNAME_REGEX = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/

const zhPrefixes = [
  '\u5143\u7d20',
  '\u91cf\u5b50',
  '\u8f68\u9053',
  '\u50ac\u5316',
  '\u79bb\u5b50',
  '\u661f\u7130',
  '\u88c2\u53d8',
  '\u6676\u683c',
  '\u71c3\u7d20',
  '\u6781\u5149',
  '\u53cd\u5e94',
  '\u5206\u5b50',
] as const

const zhSuffixes = [
  '\u65c5\u4eba',
  '\u672f\u58eb',
  '\u730e\u624b',
  '\u884c\u8005',
  '\u5b66\u5f92',
  '\u9a91\u58eb',
  '\u4f7f\u8005',
  '\u5de5\u5320',
  '\u6307\u6325\u5b98',
  '\u89c2\u5bdf\u8005',
  '\u8c03\u548c\u8005',
  '\u5148\u950b',
] as const

const zhExtras = ['\u7532', '\u4e59', '\u9706', 'X', 'Z', 'Nova', 'Prime'] as const

const enPrefixes = ['Element', 'Quantum', 'Orbital', 'Catalyst', 'Ion', 'Photon', 'Nebula', 'Plasma', 'Nova', 'Rune', 'Echo', 'Fusion'] as const
const enSuffixes = ['Walker', 'Crafter', 'Hunter', 'Voyager', 'Knight', 'Weaver', 'Pilot', 'Striker', 'Sage', 'Smith', 'Spark', 'Rider'] as const
const enExtras = ['X', 'Prime', 'Nova', 'Zero', 'Core', 'Flux'] as const

const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]

const resolveNicknameLocale = (locale?: string) => {
  const rawLocale = locale || (typeof navigator !== 'undefined' ? navigator.language : '')
  return rawLocale.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}

export const hasUsableNickname = (value: unknown) => String(value ?? '').trim().length > 0

export const isValidNickname = (value: string) => {
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= MAX_NICKNAME_LENGTH && NICKNAME_REGEX.test(trimmed)
}

export const createRandomNickname = (locale?: string) => {
  if (resolveNicknameLocale(locale) === 'zh-CN') {
    for (let attempts = 0; attempts < 8; attempts += 1) {
      const useExtra = Math.random() > 0.55
      const nickname = `${pick(zhPrefixes)}${pick(zhSuffixes)}${useExtra ? pick(zhExtras) : ''}${Math.floor(Math.random() * 90 + 10)}`
      if (isValidNickname(nickname)) return nickname
    }
  }

  const connector = Math.random() > 0.6 ? '_' : ''
  const useExtra = Math.random() > 0.5
  const nickname = `${pick(enPrefixes)}${connector}${pick(enSuffixes)}${useExtra ? pick(enExtras) : ''}${Math.floor(Math.random() * 90 + 10)}`
  return nickname.slice(0, MAX_NICKNAME_LENGTH)
}
