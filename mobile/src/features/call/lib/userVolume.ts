/** Volume e "silenciar" de uma pessoa da chamada, só para mim (como no Discord e no desktop). Volume de 0 a 1. */
export interface UserAudio {
  volume: number
  muted: boolean
}

export const DEFAULT_USER_AUDIO: UserAudio = { volume: 1, muted: false }

/** Volume que de fato sai no alto-falante para essa pessoa. */
export function outputVolume(audio: UserAudio | undefined): number {
  const { volume, muted } = audio ?? DEFAULT_USER_AUDIO
  return muted ? 0 : volume
}

export const clampVolume = (volume: number): number => Math.min(1, Math.max(0, volume))

/** Um passo (de 10%) para cima (`1`) ou para baixo (`-1`). */
export function stepVolume(volume: number, direction: 1 | -1): number {
  return clampVolume(Math.round(volume * 10 + direction) / 10)
}

export const volumePercent = (volume: number): string => `${Math.round(volume * 100)}%`
