import crypto from 'crypto'
import { config } from '../../config'

// GitHub OAuth tokens are encrypted at rest (AES-256-GCM), so a database leak
// doesn't hand out every user's GitHub access. The key comes from
// TOKEN_ENCRYPTION_KEY, or is derived from JWT_SECRET when that isn't set.
// Values written before encryption existed have no prefix and are read as-is;
// they're re-encrypted the next time that user signs in.

const PREFIX = 'enc:v1:'
const IV_BYTES = 12
const TAG_BYTES = 16

let cachedKey: Buffer | null = null
const key = (): Buffer => {
  if (cachedKey) return cachedKey
  const secret = process.env.TOKEN_ENCRYPTION_KEY || config.jwtSecret
  cachedKey = Buffer.from(crypto.hkdfSync('sha256', secret, 'osca-token-cipher', 'github-oauth-token', 32))
  return cachedKey
}

export const encryptToken = (plain: string): string => {
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64')
}

export const decryptToken = (stored: string): string => {
  if (!stored.startsWith(PREFIX)) return stored
  const raw = Buffer.from(stored.slice(PREFIX.length), 'base64')
  const iv = raw.subarray(0, IV_BYTES)
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const body = raw.subarray(IV_BYTES + TAG_BYTES)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8')
}
