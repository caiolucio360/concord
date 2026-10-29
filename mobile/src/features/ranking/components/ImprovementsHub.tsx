import { Ionicons } from '@expo/vector-icons'
import { useEffect } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, MIN_TOUCH, radius, spacing } from '../../../shared/theme/tokens'
import { IconButton } from '../../../shared/ui/IconButton'
import { rankStat } from '../lib/hub'
import { useRankingStore } from '../store/rankingStore'

interface ImprovementsHubProps {
  onBack: () => void
  onOpenRanking: () => void
}

/** Aba do diamante ("Melhorias"): um card para cada assunto. Por enquanto só o Rank global. */
export function ImprovementsHub({ onBack, onOpenRanking }: ImprovementsHubProps) {
  const ranking = useRankingStore((s) => s.ranking)
  const fetch = useRankingStore((s) => s.fetch)
  useEffect(() => {
    void fetch()
  }, [fetch])
  const stat = rankStat(ranking !== null, ranking?.me ?? null)
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" label="Voltar" onPress={onBack} />
        <Text accessibilityRole="header" style={styles.title}>
          Melhorias
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Rank global" onPress={onOpenRanking} style={styles.card}>
          <Ionicons name="trophy" size={28} color={colors.yellow} />
          <View style={styles.texts}>
            <Text style={styles.cardTitle}>Rank global</Text>
            <Text style={styles.cardText}>Quem mais passou tempo em call.</Text>
            {stat ? <Text style={styles.stat}>{stat}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.interactiveNormal} />
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  title: { color: colors.textStrong, fontSize: fontSize.lg, fontWeight: '700' },
  content: { gap: spacing.md, padding: spacing.lg },
  card: { minHeight: MIN_TOUCH * 2, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface },
  texts: { flex: 1, gap: 2 },
  cardTitle: { color: colors.textStrong, fontSize: fontSize.md, fontWeight: '700' },
  cardText: { color: colors.textMuted, fontSize: fontSize.sm },
  stat: { color: colors.textBrand, fontSize: fontSize.sm, fontWeight: '600' }
})
