import { Ionicons } from '@expo/vector-icons'
import { useEffect } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, radius, spacing } from '../../../shared/theme/tokens'
import { IconButton } from '../../../shared/ui/IconButton'
import { PathIcon } from '../../../shared/ui/PathIcon'
import { CROWN_PATHS, DIAMOND_PATHS, SPARKLE_PATHS } from '../../../shared/ui/icons/hubIcons'
import { rankStat } from '../lib/hub'
import { useRankingStore } from '../store/rankingStore'

interface ImprovementsHubProps {
  onBack: () => void
  onOpenRanking: () => void
  onOpenChangelog: () => void
}

/** Cada card tem a sua cor (as mesmas do hub da web: violeta, esmeralda e âmbar). */
const TONES = {
  novidades: { glow: '#10b981', icon: '#34d399' },
  rank: { glow: '#fbbf24', icon: '#fcd34d' }
} as const

interface HubCardProps {
  title: string
  description: string
  stat?: string | null
  tone: { glow: string; icon: string }
  paths: string[]
  onPress: () => void
}

/** Card grande do hub: leva à tela do assunto (mesma estrutura do HubCard da web). */
function HubCard({ title, description, stat, tone, paths, onPress }: HubCardProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={styles.card}>
      <View pointerEvents="none" style={[styles.glow, { backgroundColor: tone.glow }]} />
      <View style={styles.iconBox}>
        <PathIcon paths={paths} color={tone.icon} size={28} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardText}>{description}</Text>
      </View>
      <View style={styles.footer}>
        <Text numberOfLines={1} style={styles.stat}>
          {stat ?? ' '}
        </Text>
        <Ionicons name="chevron-forward" size={20} color={colors.interactiveNormal} />
      </View>
    </Pressable>
  )
}

/** Aba do diamante ("Melhorias"): um card para cada assunto (Novidades e Rank global; Propostas ainda não). */
export function ImprovementsHub({ onBack, onOpenRanking, onOpenChangelog }: ImprovementsHubProps) {
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
        <PathIcon paths={DIAMOND_PATHS} color="#a78bfa" size={24} />
        <Text accessibilityRole="header" style={styles.title}>
          Melhorias
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>Ajude a decidir o que vem por aí, veja o que mudou e confira quem manda nas calls.</Text>
        <HubCard title="Novidades" description="O que mudou em cada versão da Salinha." tone={TONES.novidades} paths={SPARKLE_PATHS} onPress={onOpenChangelog} />
        <HubCard title="Rank global" description="Os 100 maiores níveis da Salinha." stat={stat} tone={TONES.rank} paths={CROWN_PATHS} onPress={onOpenRanking} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  title: { color: colors.textStrong, fontSize: fontSize.lg, fontWeight: '700' },
  content: { gap: spacing.lg, padding: spacing.lg },
  intro: { color: colors.textMuted, fontSize: fontSize.sm },
  card: { minHeight: 176, gap: spacing.md, padding: spacing.xl, overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.bgSurface },
  glow: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, opacity: 0.18 },
  iconBox: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.05)' },
  texts: { flex: 1, gap: spacing.xs },
  cardTitle: { color: colors.textStrong, fontSize: fontSize.lg, fontWeight: '700' },
  cardText: { color: colors.textMuted, fontSize: fontSize.sm },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  stat: { flex: 1, color: colors.textNormal, fontSize: fontSize.xs, fontWeight: '600' }
})
