import { VideoView } from '@livekit/react-native'
import { useEffect, useState } from 'react'
import type { VideoTrack } from 'livekit-client'
import { StyleSheet } from 'react-native'

// As câmeras da chamada (a minha e as dos outros), que o livekitMedia.ts registra. Fica com o SDK, fora da
// cobertura do Jest como o livekitScreen.tsx; quem usa recebe o componente por injeção (ADR 0023).

const tracks = new Map<string, VideoTrack>()
const listeners = new Set<(userId: string) => void>()

/** Guarda (ou tira, sem faixa) a câmera de `userId` e avisa quem desenha. */
export function setCameraTrack(userId: string, track: VideoTrack | undefined): void {
  if (track) tracks.set(userId, track)
  else tracks.delete(userId)
  listeners.forEach((l) => l(userId))
}

export function clearCameraTracks(): void {
  const ids = [...tracks.keys()]
  tracks.clear()
  ids.forEach((id) => listeners.forEach((l) => l(id)))
}

/** O vídeo da câmera de `userId`; `mirror` na minha (como num espelho, igual ao Discord). */
export function LiveCamera({ userId, mirror = false }: { userId: string; mirror?: boolean }) {
  const [track, setTrack] = useState<VideoTrack | undefined>(() => tracks.get(userId))
  useEffect(() => {
    setTrack(tracks.get(userId))
    const listener = (id: string): void => {
      if (id === userId) setTrack(tracks.get(userId))
    }
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [userId])
  return <VideoView videoTrack={track} objectFit="cover" mirror={mirror} style={StyleSheet.absoluteFill} />
}
