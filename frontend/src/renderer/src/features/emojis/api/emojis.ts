import { API_BASE_URL } from '../../../shared/lib/config'
import { useAuthStore } from '../../auth/store/authStore'
import { ApiError, refreshTokens, request } from '../../../shared/api/client'
import type { BasePack } from '../lib/baseEmojis'

export const MAX_EMOJI_BYTES = 256 * 1024
export const MAX_EMOJIS_PER_SERVER = 50
export const EMOJI_ACCEPT = 'image/png,image/jpeg,image/webp,image/avif,image/gif'

export interface CustomEmoji {
  id: string
  server_id: string
  uploader_id: string
  name: string
  content_type: string
  size_bytes: number
  created_at: string
}

/** Os emojis de um servidor de que a pessoa é membro. */
export interface ServerEmojis {
  server_id: string
  server_name: string
  server_icon_url?: string | null
  emojis: CustomEmoji[]
}

export function fetchMyEmojis(): Promise<ServerEmojis[]> {
  return request<ServerEmojis[]>('/emojis')
}

export function fetchBasePack(): Promise<BasePack> {
  return request<BasePack>('/emojis/base')
}

export function deleteServerEmoji(serverId: string, emojiId: string): Promise<void> {
  return request<void>(
    `/servers/${encodeURIComponent(serverId)}/emojis/${encodeURIComponent(emojiId)}`,
    { method: 'DELETE' }
  )
}

export function emojiFileUrl(emojiId: string, mediaToken: string): string {
  return `${API_BASE_URL}/emojis/${encodeURIComponent(emojiId)}/file?token=${encodeURIComponent(mediaToken)}`
}

export async function uploadServerEmoji(
  serverId: string,
  name: string,
  file: Blob
): Promise<CustomEmoji> {
  const token = useAuthStore.getState().accessToken
  try {
    return await sendEmojiUpload(serverId, name, file, token)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && token && (await refreshTokens())) {
      return sendEmojiUpload(serverId, name, file, useAuthStore.getState().accessToken)
    }
    throw err
  }
}

async function sendEmojiUpload(
  serverId: string,
  name: string,
  file: Blob,
  token: string | null
): Promise<CustomEmoji> {
  const form = new FormData()
  form.append('name', name)
  form.append('file', file, 'emoji')
  const res = await fetch(`${API_BASE_URL}/servers/${encodeURIComponent(serverId)}/emojis`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form
  })
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Upload failed: ${res.status}`)
  return body as unknown as CustomEmoji
}
