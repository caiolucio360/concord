import { isMaestroIdentity } from '../../music/lib/music'
import type { CallUser } from './callTypes'

const MAESTRO_NAME = 'Maestro'

/**
 * Soma à lista da chamada o Maestro, que só existe na sala de mídia (identidade `bot-music:<canal>`, o backend
 * não o lista) e some quando sai dela. Pessoas continuam vindo só do backend e dos eventos: uma pessoa que saiu
 * não pode voltar como fantasma porque o LiveKit ainda não percebeu. Sem mudança, devolve a mesma lista.
 */
export function mergeMediaPeers(people: CallUser[], peers: Record<string, string>, meId: string | null): CallUser[] {
  const known = new Set(people.map((p) => p.id))
  const kept = people.filter((p) => !p.is_bot || p.id in peers)
  const added: CallUser[] = Object.entries(peers)
    .filter(([id]) => id !== meId && !known.has(id) && isMaestroIdentity(id))
    .map(([id, name]) => ({ id, username: '', display_name: name || MAESTRO_NAME, avatar_url: null, is_bot: true }))
  return kept.length === people.length && added.length === 0 ? people : [...kept, ...added]
}
