import { VideoView } from '@livekit/react-native'
import { useEffect, useState } from 'react'
import type { VideoTrack } from 'livekit-client'
import { StyleSheet } from 'react-native'
import { getScreenTrack, onScreenTrack } from './livekitMedia'

/**
 * Desenha a transmissão de tela de `userId` (a faixa chega depois do "Assistir"). Fica com o SDK, fora da
 * cobertura do Jest como o livekitMedia.ts (ADR 0023/0027); quem usa recebe este componente por injeção.
 */
export function LiveScreen({ userId }: { userId: string }) {
  const [track, setTrack] = useState<VideoTrack | undefined>(() => getScreenTrack(userId))
  useEffect(() => {
    setTrack(getScreenTrack(userId))
    return onScreenTrack((id) => id === userId && setTrack(getScreenTrack(userId)))
  }, [userId])
  return <VideoView videoTrack={track} objectFit="contain" style={styles.video} />
}

const styles = StyleSheet.create({
  video: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' }
})
