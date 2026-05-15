/**
 * 加密工具 - 用于安全存储AI API密钥
 */

const ENCRYPTION_ALGORITHM = 'AES-GCM'
const ENCRYPTION_KEY_LENGTH = 256

/**
 * 派生加密密钥
 */
async function deriveEncryptionKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const data = encoder.encode('chemistry-uno-ai-encryption-salt-v1')

  const baseKey = await crypto.subtle.importKey(
    'raw',
    data,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: data,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: ENCRYPTION_ALGORITHM, length: ENCRYPTION_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * 加密文本
 */
export async function encryptText(plaintext: string): Promise<string> {
  try {
    const key = await deriveEncryptionKey()
    const encoder = new TextEncoder()
    const data = encoder.encode(plaintext)
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const encrypted = await crypto.subtle.encrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      data
    )

    const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)

    const base64 = btoa(String.fromCharCode.apply(null, Array.from(combined)))
    return `enc_${base64}`
  } catch (error) {
    console.error('Encryption failed:', error)
    throw new Error('Failed to encrypt API key')
  }
}

/**
 * 解密文本
 */
export async function decryptText(ciphertext: string): Promise<string> {
  try {
    if (!ciphertext.startsWith('enc_')) {
      return ciphertext
    }

    const key = await deriveEncryptionKey()
    const base64 = ciphertext.slice(4)
    const combined = new Uint8Array(
      atob(base64)
        .split('')
        .map((c) => c.charCodeAt(0))
    )

    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)

    const decrypted = await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      key,
      encrypted
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    console.error('Decryption failed:', error)
    throw new Error('Failed to decrypt API key')
  }
}

/**
 * 检查是否已加密
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith('enc_')
}
