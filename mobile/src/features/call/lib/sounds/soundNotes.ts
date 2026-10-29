// Efeitos sonoros da chamada, definidos como notas (as mesmas do desktop: features/call/lib/sounds.ts).
// O app sintetiza cada som em WAV na hora (synthWav.ts), sem arquivos de áudio.

export type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth'

export interface Note {
  freq: number
  /** início, em segundos */
  at: number
  duration: number
  /** ganho no pico; sem valor, BASE_VOLUME */
  volume?: number
  wave?: Wave
  /** Glissando: a frequência desliza até este valor no fim da nota. */
  slide?: number
}

/** Volume de todos os sons, menos os que pedem outro. */
export const BASE_VOLUME = 0.12

/** Alguém entrando na call que estou: ~3x mais alto, para não passar batido. */
const USER_JOIN_VOLUME = 0.36

const tone = (freq: number, at: number, duration = 0.09, volume?: number): Note => ({
  freq,
  at,
  duration,
  ...(volume === undefined ? {} : { volume })
})

const sweep = (freq: number, to: number, at: number, duration: number): Note => ({ ...tone(freq, at, duration), slide: to })

export const noteVolume = (note: Note): number => note.volume ?? BASE_VOLUME

export const SOUNDS = {
  join: [tone(587, 0), tone(880, 0.1, 0.14)],
  leave: [tone(880, 0), tone(587, 0.1, 0.14)],
  userJoin: [tone(660, 0, 0.07, USER_JOIN_VOLUME), tone(880, 0.08, 0.08, USER_JOIN_VOLUME), tone(1109, 0.17, 0.12, USER_JOIN_VOLUME)],
  userLeave: [tone(880, 0, 0.07), tone(660, 0.08, 0.1)],
  mute: [tone(520, 0, 0.06), tone(390, 0.07, 0.08)],
  unmute: [tone(390, 0, 0.06), tone(520, 0.07, 0.08)],
  deafen: [tone(440, 0, 0.07), tone(294, 0.08, 0.1)],
  undeafen: [tone(294, 0, 0.07), tone(440, 0.08, 0.1)],
  lock: [tone(1047, 0, 0.05), tone(784, 0.06, 0.07)],
  unlock: [tone(784, 0, 0.05), tone(1047, 0.06, 0.07)],
  knock: [tone(392, 0, 0.06), tone(392, 0.12, 0.06), tone(523, 0.26, 0.12)],
  message: [tone(784, 0, 0.08), tone(1047, 0.09, 0.12)],
  mention: [tone(988, 0, 0.12), tone(1319, 0.13, 0.22)],
  liveStart: [sweep(440, 880, 0, 0.12), tone(1175, 0.13, 0.07), tone(1568, 0.21, 0.18)],
  liveEnd: [tone(1568, 0, 0.07), tone(1175, 0.08, 0.07), sweep(880, 440, 0.16, 0.16)],
  liveJoin: [sweep(1200, 1800, 0, 0.07), tone(2093, 0.08, 0.09)]
} satisfies Record<string, Note[]>

export type SoundName = keyof typeof SOUNDS
