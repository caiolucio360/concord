import { isMaestroIdentity } from '../../music/lib/music'
import type { CallUser } from './callTypes'

const UNKNOWN_NAME = 'Usuário'
const MAESTRO_NAME = 'Maestro'

/**
 * Une a lista do backend com quem está na sala de mídia (identidade -> nome do LiveKit), como no desktop: o
 * LiveKit é quem sabe quem está de fato lá. O Maestro só existe na mídia (identidade `bot-music:<canal>`) e some
 * da lista quando sai da sala; pessoas só saem pelos eventos do servidor. Sem mudança, devolve a mesma lista.
 */
export function mergeMediaPeers(people: CallUser[], peers: Record<string, string>, meId: string | null): CallUser[] {
  const known = new Set(people.map((p) => p.id))
  const kept = people.filter((p) => !p.is_bot || p.id in peers)
  const added: CallUser[] = Object.entries(peers)
    .filter(([id]) => id !== meId && !known.has(id))
    .map(([id, name]) => {
      const bot = isMaestroIdentity(id)
      return { id, username: '', display_name: name || (bot ? MAESTRO_NAME : UNKNOWN_NAME), avatar_url: null, ...(bot ? { is_bot: true } : {}) }
    })
  return kept.length === people.length && added.length === 0 ? people : [...kept, ...added]
}
