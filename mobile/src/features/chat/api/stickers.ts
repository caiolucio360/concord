import { request } from '../../../shared/api/client'

export interface ServerSticker {
  id: string
  server_id: string
  uploader_id: string
  uploader_name?: string
  name: string
  content_type: string
  size_bytes: number
  created_at: string
}

export function fetchServerStickers(serverId: string): Promise<ServerSticker[]> {
  return request<ServerSticker[]>(`/servers/${encodeURIComponent(serverId)}/stickers`)
}
