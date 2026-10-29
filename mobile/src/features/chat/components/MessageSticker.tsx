import { useState } from 'react'
import { Image, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, radius, spacing } from '../../../shared/theme/tokens'
import type { MessageSticker as Sticker } from '../api/messages'
import { useStickerSrc } from '../hooks/useStickerSrc'

/** Figurinha do servidor: 144 dp, baixada com o token de mídia (igual ao desktop). */
export function MessageSticker({ sticker }: { sticker: Sticker }) {
  const { src, failed: tokenFailed } = useStickerSrc(sticker.id)
  const [imageFailed, setImageFailed] = useState(false)
  const failed = tokenFailed || imageFailed

  if (failed) {
    return (
      <View style={[styles.box, styles.failed]}>
        <Text style={styles.failedText}>Figurinha indisponível</Text>
      </View>
    )
  }
  if (!src) return <View style={[styles.box, styles.loading]} />
  return <Image source={{ uri: src }} accessibilityLabel={sticker.name} style={styles.box} resizeMode="contain" onError={() => setImageFailed(true)} />
}

const styles = StyleSheet.create({
  box: { width: 144, height: 144, marginVertical: spacing.xs },
  loading: { borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.05)' },
  failed: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderNormal, backgroundColor: 'rgba(255,255,255,0.05)' },
  failedText: { color: colors.textFaint, fontSize: fontSize.xs, textAlign: 'center' }
})
