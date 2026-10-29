import { createAudioPlayer } from 'expo-audio'
import { SOUNDS, type SoundName } from './soundNotes'
import { wavDataUri } from './synthWav'

/** O pouco que o player precisa ter (o AudioPlayer do expo-audio cumpre). */
export interface SoundHandle {
  seekTo: (seconds: number) => unknown
  play: () => void
}

/**
 * Toca os efeitos sonoros: cada som é sintetizado uma vez, na primeira vez que toca, e fica num player
 * reaproveitado. Nunca lança: falha de áudio não pode derrubar a chamada.
 */
export function createSoundPlayer(make: (uri: string) => SoundHandle): (name: SoundName) => void {
  const players = new Map<SoundName, SoundHandle>()
  return (name) => {
    try {
      let player = players.get(name)
      if (!player) {
        player = make(wavDataUri(SOUNDS[name]))
        players.set(name, player)
      }
      void player.seekTo(0)
      player.play()
    } catch {
      // sem áudio disponível: fica sem o som
    }
  }
}

export const playSound = createSoundPlayer((uri) => createAudioPlayer({ uri }))
