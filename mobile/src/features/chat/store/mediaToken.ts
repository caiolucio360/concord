import { useAuthStore } from '../../auth/store/authStore'
import { fetchMediaToken } from '../api/attachments'

// Token de mídia em memória, dividido por todas as mídias da tela. Renova 10 min
// antes de vencer, para uma URL nova nunca nascer morta. Mesma regra do desktop.
const RENEW_BEFORE_MS = 10 * 60_000

export interface CachedMediaToken {
  token: string
  expiresAt: number
  /** Access token de quando foi pedido: trocou (login/logout) → pede outro. */
  accessToken: string
}

let cached: CachedMediaToken | null = null
let pending: Promise<string> | null = null

export function needsNewMediaToken(current: CachedMediaToken | null, accessToken: string | null, now: number): boolean {
  if (!current) return true
  if (current.accessToken !== accessToken) return true
  return current.expiresAt - now < RENEW_BEFORE_MS
}

export function ensureMediaToken(now: number = Date.now()): Promise<string> {
  const accessToken = useAuthStore.getState().accessToken
  if (cached && !needsNewMediaToken(cached, accessToken, now)) return Promise.resolve(cached.token)
  if (pending) return pending
  const request = fetchMediaToken()
    .then(({ token, expires_at }) => {
      cached = { token, expiresAt: Date.parse(expires_at), accessToken: useAuthStore.getState().accessToken ?? '' }
      return token
    })
    .finally(() => {
      if (pending === request) pending = null
    })
  pending = request
  return request
}

/** Descarta o token (o servidor recusou um arquivo com ele). Com usedToken, só se ainda for o atual. */
export function invalidateMediaToken(usedToken?: string): void {
  if (usedToken !== undefined && cached?.token !== usedToken) return
  cached = null
  pending = null
}
