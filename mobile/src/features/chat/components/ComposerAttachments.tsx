import { Ionicons } from '@expo/vector-icons'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, radius, spacing } from '../../../shared/theme/tokens'
import { formatBytes, type DraftAttachment } from '../lib/attachments'

/** Fileira de anexos acima do campo de texto, com progresso e erro (igual ao desktop). */
export function ComposerAttachments({ drafts, onRemove }: { drafts: DraftAttachment[]; onRemove: (localId: string) => void }) {
  if (drafts.length === 0) return null
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
      {drafts.map((d) => (
        <View key={d.localId} style={[styles.card, d.status === 'error' && styles.cardError]}>
          <View style={styles.preview}>
            {d.kind === 'image' ? (
              <Image source={{ uri: d.file.uri }} style={styles.fill} resizeMode="cover" />
            ) : (
              <Ionicons name={d.kind === 'video' ? 'videocam' : 'musical-notes'} size={28} color={colors.textMuted} />
            )}
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {d.file.name}
          </Text>
          <Text style={styles.size}>{formatBytes(d.file.size)}</Text>
          {d.status === 'uploading' ? (
            <View accessible accessibilityRole="progressbar" accessibilityLabel={`Enviando ${d.file.name}`} accessibilityValue={{ min: 0, max: 100, now: Math.round(d.progress * 100) }} style={styles.bar}>
              <View style={[styles.barFill, { width: `${Math.round(d.progress * 100)}%` }]} />
            </View>
          ) : null}
          {d.status === 'error' ? <Text style={styles.error}>{d.error}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={`Remover anexo ${d.file.name}`} onPress={() => onRemove(d.localId)} hitSlop={10} style={styles.remove}>
            <Text style={styles.removeText}>×</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingBottom: spacing.xs },
  card: { width: 140, gap: 2, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.bgInput },
  cardError: { borderColor: 'rgba(239,68,68,0.5)' },
  preview: { height: 72, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)' },
  fill: { width: '100%', height: '100%' },
  name: { color: colors.textNormal, fontSize: fontSize.xs },
  size: { color: colors.textFaint, fontSize: 10 },
  bar: { height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
  barFill: { height: '100%', backgroundColor: '#a78bfa' },
  error: { color: colors.textDanger, fontSize: 10 },
  remove: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  removeText: { color: colors.textNormal, fontSize: 16, lineHeight: 18 }
})
