import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, radius, spacing } from '../../../shared/theme/tokens'
import type { ServerSticker } from '../api/stickers'
import { useStickerSrc } from '../hooks/useStickerSrc'

function StickerThumb({ sticker, onSelect }: { sticker: ServerSticker; onSelect: (sticker: ServerSticker) => void }) {
  const { src } = useStickerSrc(sticker.id)
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={sticker.name} onPress={() => onSelect(sticker)} style={styles.cell}>
      {src ? <Image source={{ uri: src }} style={styles.image} resizeMode="contain" /> : <View style={styles.loading} />}
    </Pressable>
  )
}

interface StickersTabProps {
  serverId?: string | null
  stickers: ServerSticker[]
  loading: boolean
  search: string
  onSelect: (sticker: ServerSticker) => void
}

/** Aba "Figurinhas" do seletor: as figurinhas do servidor, 3 por linha, filtradas pela busca. */
export function StickersTab({ serverId, stickers, loading, search, onSelect }: StickersTabProps) {
  if (!serverId) return <Message text="Figurinhas ficam disponíveis em canais de servidores." />
  if (loading) return <Message text="Carregando figurinhas..." />
  if (stickers.length === 0) return <Message text="Nenhuma figurinha no servidor ainda." />
  const q = search.trim().toLowerCase()
  const shown = q ? stickers.filter((s) => s.name.toLowerCase().includes(q)) : stickers
  return (
    <View style={styles.fill}>
      <Text style={styles.count}>{stickers.length} / 60 figurinhas</Text>
      <ScrollView contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled">
        {shown.map((s) => (
          <StickerThumb key={s.id} sticker={s} onSelect={onSelect} />
        ))}
      </ScrollView>
    </View>
  )
}

function Message({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, gap: spacing.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyText: { color: colors.textFaint, fontSize: fontSize.xs, textAlign: 'center' },
  count: { color: colors.textMuted, fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { width: '31%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.05)', padding: 4 },
  image: { width: '100%', height: '100%' },
  loading: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.1)' }
})
