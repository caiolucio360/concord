import type { PublicationEntry, TrackEntry } from './callMedia'
import { isScreenHelper, mediaOwner } from './screenIdentity'

// Lê os participantes da sala no formato da UI: tracks por usuário, quem
// publica o quê e quem está na sala. A live pelo helper nativo
// (`<id>:screen`) vira a tela da pessoa dona; o helper não é uma pessoa.
// Sem dependência do livekit-client para poder ser testado isolado.

export interface RemoteRoomPublication {
  source: string
  isSubscribed: boolean
  isMuted: boolean
  track?: { mediaStreamTrack: MediaStreamTrack; kind: string }
}

export interface RemoteRoomParticipant {
  identity: string
  name?: string
  trackPublications: Map<string, RemoteRoomPublication>
}

export interface RemoteEntries {
  entries: TrackEntry[]
  publications: PublicationEntry[]
  mediaPeers: Record<string, string>
}

function subscribedTrack(userId: string, publication: RemoteRoomPublication): TrackEntry | null {
  const track = publication.track
  if (!publication.isSubscribed || !track) return null
  // Vídeo pausado (câmera desligada pelo SO, etc.) some da UI.
  if (track.kind === 'video' && publication.isMuted) return null
  return { userId, source: publication.source, track: track.mediaStreamTrack }
}

/**
 * `ownScreen`: o meu helper nativo na sala. A tela dele vem só para a minha
 * prévia — não entra nas publicações (não é a tela de outra pessoa).
 */
export function remoteEntries(
  participants: Iterable<RemoteRoomParticipant>,
  ownScreen: string | null
): RemoteEntries {
  const out: RemoteEntries = { entries: [], publications: [], mediaPeers: {} }
  for (const participant of participants) {
    const userId = mediaOwner(participant.identity)
    if (!isScreenHelper(participant.identity)) out.mediaPeers[userId] = participant.name ?? ''
    const own = participant.identity === ownScreen
    participant.trackPublications.forEach((publication) => {
      if (!own) out.publications.push({ userId, source: publication.source })
      const entry = subscribedTrack(userId, publication)
      if (entry) out.entries.push(entry)
    })
  }
  return out
}
