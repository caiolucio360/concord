import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, radius, spacing } from '../../../shared/theme/tokens'
import { Button } from '../../../shared/ui/Button'
import { IconButton } from '../../../shared/ui/IconButton'
import { fetchChangelog, type ChangelogRelease } from '../api/changelog'
import { formatReleaseDate, groupEntries } from '../lib/changelog'

function Group({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  if (items.length === 0) return null
  return (
    <View style={styles.group}>
      <Text style={[styles.tag, { color: tone }]}>{title}</Text>
      {items.map((text, i) => (
        <View key={i} style={styles.itemRow}>
          <Text style={styles.item}>•</Text>
          <Text style={[styles.item, styles.itemText]}>{text}</Text>
        </View>
      ))}
    </View>
  )
}

function Release({ release }: { release: ChangelogRelease }) {
  const { features, fixes } = groupEntries(release)
  return (
    <View style={styles.card}>
      <View style={styles.versionRow}>
        <Text style={styles.version}>v{release.version}</Text>
        <Text style={styles.date}>{formatReleaseDate(release.released_at)}</Text>
      </View>
      {release.summary ? <Text style={styles.summary}>{release.summary}</Text> : null}
      <Group title="Novidades" items={features} tone={colors.green} />
      <Group title="Correções" items={fixes} tone={colors.yellow} />
      {features.length + fixes.length === 0 ? <Text style={styles.summary}>Sem notas para esta versão.</Text> : null}
    </View>
  )
}

/** "Novidades": o que mudou em cada versão do Salinha (mesma lista do desktop e da web). */
export function ChangelogScreen({ onBack }: { onBack: () => void }) {
  const [releases, setReleases] = useState<ChangelogRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchChangelog()
      .then(setReleases)
      .catch(() => setError('Não foi possível carregar as novidades.'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" label="Voltar" onPress={onBack} />
        <Text accessibilityRole="header" style={styles.title}>
          Novidades
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator testID="changelog-loading" color={colors.brand} /> : null}
        {error ? (
          <View style={styles.errorRow}>
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
            <Button title="Tentar de novo" variant="secondary" onPress={load} />
          </View>
        ) : null}
        {!loading && !error && releases.length === 0 ? <Text style={styles.summary}>Nenhuma versão publicada ainda.</Text> : null}
        {releases.map((r) => (
          <Release key={r.version} release={r} />
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  title: { color: colors.textStrong, fontSize: fontSize.lg, fontWeight: '700' },
  content: { gap: spacing.md, padding: spacing.lg },
  card: { gap: spacing.xs, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface },
  versionRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
  version: { color: colors.textStrong, fontSize: fontSize.lg, fontWeight: '700' },
  date: { color: colors.textMuted, fontSize: fontSize.sm },
  summary: { color: colors.textMuted, fontSize: fontSize.sm },
  group: { gap: spacing.xs, marginTop: spacing.sm },
  tag: { fontSize: fontSize.sm, fontWeight: '700' },
  itemRow: { flexDirection: 'row', gap: spacing.sm },
  itemText: { flex: 1 },
  item: { color: colors.textNormal, fontSize: fontSize.sm },
  errorRow: { gap: spacing.sm },
  error: { color: colors.red, fontSize: fontSize.sm }
})
