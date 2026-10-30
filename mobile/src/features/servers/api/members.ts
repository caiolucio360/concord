import { request } from '../../../shared/api/client'
import type { NameStyle } from '../../profile/lib/nameStyle'
import type { Server } from './servers'

/** Cargo do servidor (backend: internal/role), só os campos que a lista de membros usa. */
export interface Role {
  id: string
  name: string
  /** Cor RGB (0xRRGGBB) ou null. */
  color: number | null
  /** Hierarquia: maior = mais alto. */
  position: number
  /** "Exibir membros separadamente". */
  hoist: boolean
  /** É o @everyone. */
  is_default: boolean
  /** Cargo fixo de sistema (Bots). */
  is_system?: boolean
}

export interface ServerMember {
  user_id: string
  role_ids?: string[]
  username?: string
  display_name?: string
  avatar_url?: string | null
  name_style?: NameStyle
  is_bot?: boolean
  /** Apelido neste servidor (ganha do nome de exibição). */
  nickname?: string | null
}

export interface ServerDetail {
  server: Server
  members: ServerMember[]
  roles?: Role[]
}

/** O servidor com os membros e os cargos (o mesmo GET /servers/:id da web). */
export function getServerDetail(serverId: string): Promise<ServerDetail> {
  return request<ServerDetail>(`/servers/${encodeURIComponent(serverId)}`)
}
