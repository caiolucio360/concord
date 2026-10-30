import { useServerStore } from '../../servers/store/serverStore'
import { serverDisplayName } from '../../servers/lib/serverNames'
import type { CallKind, CallUserInfo } from './callStore'

// Nomes e lista de quem está na chamada, tirados do callStore (god file) para ele encolher.

/** Nome de quem está na call: numa call de canal, com o apelido daquele servidor. */
export function callName(
  state: { type: CallKind | null; serverId: string | null },
  user: { id: string; display_name?: string | null; username?: string | null } | undefined,
  fallback?: string
): string {
  const nickname =
    state.type === 'channel' && state.serverId && user
      ? useServerStore.getState().nicknames?.[state.serverId]?.[user.id]
      : undefined
  return serverDisplayName({ nickname }, user, fallback)
}

export function upsertParticipant(list: CallUserInfo[], user: CallUserInfo): CallUserInfo[] {
  return list.some((p) => p.id === user.id) ? list : [...list, user]
}
