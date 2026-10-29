import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, MIN_TOUCH, radius, spacing } from '../../../shared/theme/tokens'
import type { Attachment } from '../api/messages'
import { useMediaSrc } from '../hooks/useMediaSrc'
import { fitMedia, formatBytes, splitAttachments } from '../lib/attachments'
import { MediaLightbox } from './MediaLightbox'

// No celular a caixa nunca passa da largura útil da conversa.
const PHONE_MAX = { width: 280, height: 300 }

/** Imagem/foto animada: caixa já no tamanho final; toque abre em tela cheia. */
function ImageAttachment({ attachment }: { attachment: Attachment }) {
  const { src, onError, failed } = useMediaSrc(attachment.id, true)
  const [open, setOpen] = useState(false)
  const box = fitMedia(attachment.width, attachment.height, PHONE_MAX)
  return (
    <>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={attachment.filename}
        onPress={() => src && !failed && setOpen(true)}
        style={[styles.media, box]}
      >
        {failed ? (
          <Text style={styles.failed}>Não foi possível carregar a imagem.</Text>
        ) : src ? (
          <Image testID="anexo-imagem" source={{ uri: src }} style={styles.fill} resizeMode="cover" onError={onError} />
        ) : null}
      </Pressable>
      {open && src ? <MediaLightbox src={src} label={attachment.filename} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

/** Vídeo e áudio: cartão do arquivo; tocar abre no player do aparelho com o token de mídia. */
function FileAttachment({ attachment }: { attachment: Attachment }) {
  const [wanted, setWanted] = useState(0)
  const { src, failed } = useMediaSrc(attachment.id, wanted > 0)
  useEffect(() => {
    if (wanted > 0 && src) void Linking.openURL(src)
  }, [wanted, src])
  const video = attachment.kind === 'video'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${video ? 'Reproduzir' : 'Ouvir'} ${attachment.filename}`}
      onPress={() => setWanted((n) => n + 1)}
      style={styles.file}
    >
      <Ionicons name={video ? 'play-circle' : 'musical-notes'} size={32} color={colors.textBrand} />
      <View style={styles.fileText}>
        <Text style={styles.fileName} numberOfLines={1}>
          {attachment.filename}
        </Text>
        <Text style={styles.fileMeta}>{failed ? 'Não foi possível carregar o arquivo.' : formatBytes(attachment.size_bytes)}</Text>
      </View>
    </Pressable>
  )
}

/** Anexos de uma mensagem: imagens lado a lado, vídeos e áudios um por linha. */
export function MessageAttachments({ attachments }: { attachments: Attachment[] }) {
  const { visual, audios } = splitAttachments(attachments)
  const images = visual.filter((a) => a.kind === 'image')
  const videos = visual.filter((a) => a.kind === 'video')
  return (
    <View style={styles.list}>
      {images.length > 0 ? (
        <View style={styles.row}>
          {images.map((a) => (
            <ImageAttachment key={a.id} attachment={a} />
          ))}
        </View>
      ) : null}
      {[...videos, ...audios].map((a) => (
        <FileAttachment key={a.id} attachment={a} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { marginTop: spacing.xs, gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  media: { maxWidth: '100%', borderRadius: radius.md, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
  failed: { color: colors.textMuted, fontSize: fontSize.xs, textAlign: 'center', padding: spacing.sm },
  file: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.borderSubtle, maxWidth: 320 },
  fileText: { flex: 1 },
  fileName: { color: colors.textNormal, fontSize: fontSize.sm },
  fileMeta: { color: colors.textFaint, fontSize: fontSize.xs }
})
