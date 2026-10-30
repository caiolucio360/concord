import { VideoQuality } from 'livekit-client'
import { wantsSubscription, type TrackSourceName } from './callMedia'
import { mediaOwner } from './screenIdentity'
import { pruneWatched } from './screenWatch'
import { samePause, videoEnabled, type VideoPauseState } from './screenVideoPause'

// O que baixar de cada pessoa na chamada: voz e câmera sempre, tela (e o som
// dela) só de quem estou assistindo. Com a janela fora da tela (minimizada ou na
// bandeja), ou a live fora da área visível do app, o vídeo fica pausado no
// servidor: ninguém está vendo, e decodificar e desenhar uma live a 30-60 qps
// custa CPU e GPU que o jogo precisa. O som segue, e a live na janela flutuante
// não pausa (ver screenVideoPause.ts). A live pelo helper nativo
// (`<id>:screen`) conta como a do dono; a minha, só o vídeo (a minha prévia).

export interface RemotePublicationLike {
  source: string
  kind: string
  readonly isDesired: boolean
  setSubscribed(subscribed: boolean): void
  setEnabled(enabled: boolean): void
  setVideoQuality?(quality: VideoQuality): void
}

export interface RemoteParticipantLike {
  identity: string
  trackPublications: Map<string, RemotePublicationLike>
}

export class RemoteSubscriptions {
  private watched = new Set<string>()
  /** O meu helper nativo transmitindo (identidade na sala), ou null. */
  private ownScreen: string | null = null
  private pause: VideoPauseState = { windowHidden: false, offscreen: new Set(), pip: null }

  setWatched(userIds: string[]): void {
    this.watched = new Set(userIds)
  }

  setOwnScreen(identity: string | null): void {
    this.ownScreen = identity
  }

  /** Quem parou de transmitir sai dos assistidos (se voltar, começa pausada). */
  prune(availableScreens: string[]): void {
    this.watched = new Set(pruneWatched([...this.watched], availableScreens))
  }

  /** true se mudou (quem chama reaplica). */
  setPause(pause: VideoPauseState): boolean {
    const same = samePause(this.pause, pause)
    this.pause = pause
    return !same
  }

  apply(participants: Iterable<RemoteParticipantLike>): void {
    for (const participant of participants) {
      if (participant.identity === this.ownScreen) this.applyOwn(participant)
      else this.applyPerson(participant)
    }
  }

  private applyPerson(participant: RemoteParticipantLike): void {
    const owner = mediaOwner(participant.identity)
    for (const publication of participant.trackPublications.values()) {
      const want = wantsSubscription(publication.source as TrackSourceName, owner, this.watched)
      // Com autoSubscribe desligado, isDesired começa false.
      if (publication.isDesired !== want) publication.setSubscribed(want)
      // O SDK só aceita pausar o que está assinado; repetir o mesmo valor é no-op.
      if (want && publication.kind === 'video') {
        publication.setEnabled(videoEnabled(publication.source, owner, this.pause))
      }
    }
  }

  /** A minha live nativa: vídeo na camada de baixo (prévia); o som dela não volta (eco). */
  private applyOwn(participant: RemoteParticipantLike): void {
    for (const publication of participant.trackPublications.values()) {
      const want = publication.source === 'screen_share'
      if (publication.isDesired !== want) publication.setSubscribed(want)
      if (want) publication.setVideoQuality?.(VideoQuality.LOW)
    }
  }
}
