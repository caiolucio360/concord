import { AudioSession } from '@livekit/react-native'
import { ConnectionState, Room, RoomEvent, Track, type RemoteParticipant, type RemoteTrackPublication, type VideoTrack } from 'livekit-client'
import type { CallMedia, MediaConnection } from './callMedia'

// Os dois únicos arquivos do app que falam com o SDK do LiveKit (ADR 0023): este e livekitScreen.tsx (que só
// desenha a transmissão). Ficam fora da cobertura do Jest (módulo nativo): a lógica toda está no callController,
// testado com uma CallMedia falsa. Provado no aparelho (PR B); a transmissão de tela ainda não (ADR 0027).

/** Volume 0 silencia quem chega sem sair da sala: é o "fone" do painel do usuário. */
const setRemoteVolume = (room: Room, listening: boolean): void => {
  room.remoteParticipants.forEach((p) => p.setVolume(listening ? 1 : 0))
}

const screenOf = (p: RemoteParticipant): RemoteTrackPublication | undefined => p.getTrackPublication(Track.Source.ScreenShare)

// A faixa de vídeo da transmissão que estou assistindo, por pessoa (a tela de assistir lê daqui).
const screenTracks = new Map<string, VideoTrack>()
const screenTrackListeners = new Set<(userId: string) => void>()
const emitScreenTrack = (userId: string): void => screenTrackListeners.forEach((l) => l(userId))

/** A faixa de vídeo da transmissão de `userId`, se estou assistindo. */
export const getScreenTrack = (userId: string): VideoTrack | undefined => screenTracks.get(userId)

/** Avisa quando a faixa de `userId` chega ou sai. Devolve o "desligar". */
export function onScreenTrack(listener: (userId: string) => void): () => void {
  screenTrackListeners.add(listener)
  return () => screenTrackListeners.delete(listener)
}

export function createLiveKitMedia(): CallMedia {
  let room: Room | null = null
  let listening = true
  const speakerListeners = new Set<(ids: string[]) => void>()
  const connectionListeners = new Set<(state: MediaConnection) => void>()
  const screenListeners = new Set<(ids: string[]) => void>()

  const emitConnection = (state: MediaConnection): void => connectionListeners.forEach((l) => l(state))

  /** Quem está transmitindo a tela (eu e quem publicou a faixa de tela). */
  function emitScreens(current: Room): void {
    const ids = [...current.remoteParticipants.values()].filter((p) => screenOf(p)).map((p) => p.identity)
    if (current.localParticipant.isScreenShareEnabled) ids.push(current.localParticipant.identity)
    screenListeners.forEach((l) => l(ids))
  }

  function watch(next: Room): void {
    next.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const ids = speakers.map((s) => s.identity)
      speakerListeners.forEach((l) => l(ids))
    })
    next.on(RoomEvent.Reconnecting, () => emitConnection('reconnecting'))
    next.on(RoomEvent.Reconnected, () => emitConnection('connected'))
    next.on(RoomEvent.Disconnected, () => emitConnection('disconnected'))
    next.on(RoomEvent.ParticipantConnected, () => setRemoteVolume(next, listening))
    // Ver a tela dos outros só quando se pede: o vídeo não desce sozinho.
    next.on(RoomEvent.TrackPublished, (pub) => {
      if (pub.source === Track.Source.ScreenShare) {
        pub.setSubscribed(false)
        emitScreens(next)
      }
    })
    next.on(RoomEvent.TrackUnpublished, () => emitScreens(next))
    next.on(RoomEvent.LocalTrackPublished, () => emitScreens(next))
    next.on(RoomEvent.LocalTrackUnpublished, () => emitScreens(next))
    next.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.source !== Track.Source.ScreenShare) return
      screenTracks.set(participant.identity, track as VideoTrack)
      emitScreenTrack(participant.identity)
    })
    next.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      if (track.source !== Track.Source.ScreenShare) return
      screenTracks.delete(participant.identity)
      emitScreenTrack(participant.identity)
    })
  }

  return {
    async connect(url, token) {
      await AudioSession.startAudioSession()
      const next = new Room()
      watch(next)
      room = next
      await next.connect(url, token)
      setRemoteVolume(next, listening)
      // Quem já transmitia antes de eu entrar.
      next.remoteParticipants.forEach((p) => screenOf(p)?.setSubscribed(false))
      emitScreens(next)
    },
    async disconnect() {
      const current = room
      room = null
      screenTracks.clear()
      if (current && current.state !== ConnectionState.Disconnected) await current.disconnect()
      await AudioSession.stopAudioSession()
    },
    async setMicEnabled(on) {
      await room?.localParticipant.setMicrophoneEnabled(on)
    },
    async setScreenShareEnabled(on) {
      await room?.localParticipant.setScreenShareEnabled(on)
    },
    watchScreen(userId, on) {
      const participant = room?.remoteParticipants.get(userId)
      if (participant) screenOf(participant)?.setSubscribed(on)
    },
    setListening(on) {
      listening = on
      if (room) setRemoteVolume(room, on)
    },
    onSpeakers(listener) {
      speakerListeners.add(listener)
      return () => speakerListeners.delete(listener)
    },
    onScreens(listener) {
      screenListeners.add(listener)
      return () => screenListeners.delete(listener)
    },
    onConnection(listener) {
      connectionListeners.add(listener)
      return () => connectionListeners.delete(listener)
    }
  }
}
