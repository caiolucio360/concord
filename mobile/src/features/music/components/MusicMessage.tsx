import { StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, spacing } from '../../../shared/theme/tokens'
import { MAESTRO_NAME, splitBold, T18_TAG } from '../lib/music'
import { MaestroAvatar } from './MaestroAvatar'

/** Texto do Maestro com **negrito**. */
export function MaestroText({ text }: { text: string }) {
  return (
    <Text style={styles.text}>
      {splitBold(text).map((part, i) => (
        <Text key={i} style={part.bold ? styles.bold : undefined}>
          {part.text}
        </Text>
      ))}
    </Text>
  )
}

const hhmm = (iso: string, timeZone?: string): string =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone })

/** Mensagem do Maestro no histórico (system_kind "music" ou a lista de comandos fixada). */
export function MusicMessage({ content, createdAt, timeZone }: { content: string; createdAt: string; timeZone?: string }) {
  return (
    <View style={styles.card}>
      <MaestroAvatar />
      <View style={styles.body}>
        <View style={styles.head}>
          <Text style={styles.name}>{MAESTRO_NAME}</Text>
          <Text style={styles.tag}>{T18_TAG}</Text>
          <Text style={styles.time}>{hhmm(createdAt, timeZone)}</Text>
        </View>
        <MaestroText text={content} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, marginHorizontal: spacing.sm, marginVertical: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)', backgroundColor: 'rgba(139,92,246,0.1)' },
  body: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  name: { color: '#ddd6fe', fontSize: fontSize.sm, fontWeight: '600' },
  tag: { color: '#ddd6fe', fontSize: 9, fontWeight: '700', letterSpacing: 0.5, backgroundColor: 'rgba(167,139,250,0.2)', paddingHorizontal: 4, borderRadius: 4, overflow: 'hidden' },
  time: { color: colors.textFaint, fontSize: 10 },
  text: { color: colors.textNormal, fontSize: fontSize.sm, lineHeight: 20 },
  bold: { color: colors.textStrong, fontWeight: '700' }
})
