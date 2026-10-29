import { useEffect, useMemo, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { ApiError } from '../../../shared/api/client'
import { colors, fontSize, MIN_TOUCH, radius, spacing } from '../../../shared/theme/tokens'
import { pickSearchResult } from '../api/music'
import { formatDuration, MAESTRO_NAME, T14_DISMISS, T14_LABEL, T16_TITLE } from '../lib/music'
import { useMusicStore, type MusicEphemeral } from '../store/musicStore'
import { MaestroAvatar } from './MaestroAvatar'
import { MaestroText } from './MusicMessage'

const FAILED = 'Não foi possível adicionar. Tente de novo.'

/** Resultados de uma busca: tocar num adiciona à fila; depois de 60 s as opções ficam apagadas. */
function SearchPicker({ e, serverId }: { e: MusicEphemeral; serverId: string }) {
  const markExpired = useMusicStore((s) => s.markExpired)
  const dismiss = useMusicStore((s) => s.dismiss)
  const search = e.search!
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (e.expired) return
    const ms = search.expires_at - Date.now()
    if (ms <= 0) return markExpired(e.id)
    const timer = setTimeout(() => markExpired(e.id), ms)
    return () => clearTimeout(timer)
  }, [e.id, e.expired, search.expires_at, markExpired])

  async function pick(index: number): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      await pickSearchResult(serverId, search.token, index)
      dismiss(e.id)
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) markExpired(e.id)
      else setError(FAILED)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View>
      <Text style={styles.title}>{T16_TITLE(search.query)}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.results}>
        {search.results.map((r, i) => (
          <Pressable
            key={r.video_id}
            accessibilityRole="button"
            accessibilityLabel={`Adicionar ${r.title}`}
            disabled={e.expired || busy}
            onPress={() => void pick(i)}
            style={[styles.result, (e.expired || busy) && styles.resultOff]}
          >
            {r.thumbnail ? <Image source={{ uri: r.thumbnail }} style={styles.thumb} /> : null}
            <View style={styles.resultText}>
              <Text style={styles.resultTitle} numberOfLines={1}>
                {r.title}
              </Text>
              <Text style={styles.resultMeta} numberOfLines={1}>
                {r.artist} · {formatDuration(r.duration_ms)}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

/** Respostas do Maestro que só eu vejo (não ficam salvas), na sala aberta. */
export function MusicEphemeralList({ room, serverId }: { room: string; serverId: string | null }) {
  const all = useMusicStore((s) => s.ephemeral)
  const dismiss = useMusicStore((s) => s.dismiss)
  const items = useMemo(() => all.filter((e) => e.room === room), [all, room])
  if (items.length === 0) return null
  return (
    <View>
      {items.map((e) => (
        <View key={e.id} style={styles.card}>
          <MaestroAvatar />
          <View style={styles.body}>
            <View style={styles.head}>
              <Text style={styles.name}>{MAESTRO_NAME}</Text>
              <Text style={styles.label}>{T14_LABEL} · </Text>
              <Pressable accessibilityRole="button" accessibilityLabel={T14_DISMISS} onPress={() => dismiss(e.id)} hitSlop={12}>
                <Text style={styles.dismiss}>{T14_DISMISS}</Text>
              </Pressable>
            </View>
            {e.kind === 'text' ? <MaestroText text={e.text ?? ''} /> : null}
            {e.kind === 'search' && serverId ? <SearchPicker e={e} serverId={serverId} /> : null}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.md, marginHorizontal: spacing.sm, marginVertical: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: 'rgba(255,255,255,0.03)' },
  body: { flex: 1 },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: spacing.xs },
  name: { color: '#ddd6fe', fontSize: fontSize.sm, fontWeight: '600', marginRight: spacing.xs },
  label: { color: colors.textFaint, fontSize: 10 },
  dismiss: { color: colors.textLink, fontSize: 10 },
  title: { color: colors.textNormal, fontSize: fontSize.sm },
  error: { color: colors.textDanger, fontSize: fontSize.xs },
  results: { marginTop: spacing.sm, gap: spacing.xs },
  result: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH, padding: 6, borderRadius: 6, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: 'rgba(255,255,255,0.05)' },
  resultOff: { opacity: 0.4 },
  thumb: { width: 64, height: 36, borderRadius: 4 },
  resultText: { flex: 1 },
  resultTitle: { color: colors.textStrong, fontSize: fontSize.sm, fontWeight: '500' },
  resultMeta: { color: colors.textMuted, fontSize: fontSize.xs }
})
