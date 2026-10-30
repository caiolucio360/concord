import { useState } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { isAnimatedMedia, mediaSrc } from '../../../shared/lib/mediaUrl'
import { Avatar } from '../../../shared/ui/Avatar'

interface CallAvatarProps {
  name: string
  uri?: string | null
  size: number
  /** A pessoa está falando: o GIF anima (callAvatarAnimate). */
  speaking: boolean
}

/**
 * Avatar da chamada sem fundo cinza: o quadro parado fica sempre por baixo e o GIF (que pode ter mais de 1 MB) é
 * baixado na primeira fala, só aparece depois de carregado e continua montado (escondido) quando a pessoa para de
 * falar. Assim a fala ligando e desligando várias vezes por segundo não recarrega nada.
 */
export function CallAvatar({ name, uri, size, speaking }: CallAvatarProps) {
  const [everSpoke, setEverSpoke] = useState(false)
  const [loaded, setLoaded] = useState(false)
  if (speaking && !everSpoke) setEverSpoke(true)
  if (!isAnimatedMedia(uri)) return <Avatar name={name} uri={uri} size={size} />

  const box = { width: size, height: size, borderRadius: size / 2 }
  return (
    <View style={box}>
      <Image testID="avatar-still" accessibilityLabel={`Foto de ${name}`} source={{ uri: mediaSrc(uri, { animate: false }) ?? '' }} style={[styles.still, box]} />
      {everSpoke ? (
        <Image
          testID="avatar-animated"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          source={{ uri: mediaSrc(uri) ?? '' }}
          onLoad={() => setLoaded(true)}
          style={[StyleSheet.absoluteFill, box, { opacity: speaking && loaded ? 1 : 0 }]}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  still: { backgroundColor: 'transparent' }
})
