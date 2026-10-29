import { request } from '../../../shared/api/client'

/** Token curto (1 h) que vai na URL de imagem/vídeo/áudio. */
export function fetchMediaToken(): Promise<{ token: string; expires_at: string }> {
  return request<{ token: string; expires_at: string }>('/media/token')
}
