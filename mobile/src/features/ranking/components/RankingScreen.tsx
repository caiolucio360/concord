import { useEffect } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, MIN_TOUCH, radius, spacing } from '../../../shared/theme/tokens'
import { Avatar } from '../../../shared/ui/Avatar'
import { Button } from '../../../shared/ui/Button'
import { IconButton } from '../../../shared/ui/IconButton'
import { LevelPill } from '../../levels/components/LevelBadge'
import { nameColorOf } from '../../profile/lib/cardName'
import type { MyRank, Ranking, RankingEntry } from '../api/ranking'
import { formatXp, myPositionText, podiumSlots, positionLabel, splitRanking, type PodiumSlot } from '../lib/ranking'
import { useRankingStore } from '../store/rankingStore'

// Por colocação: tamanho do avatar, altura do degrau e cor do destaque (iguais às do desktop).
const PLACE = {
  1: { avatar: 72, step: 96, color: '#fcd34d' },
  2: { avatar: 56, step: 64, color: '#cbd5e1' },
  3: { avatar: 56, step: 48, color: '#fb923c' }
} as const

const nameOf = (e: RankingEntry): string => e.display_name || e.username

function Podium({ slot, onOpenProfile }: { slot: PodiumSlot; onOpenProfile: (id: string) => void }) {
  const { entry, place } = slot
  const look = PLACE[place]
  return (
    <View style={styles.podiumItem}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${nameOf(entry)}, ${place}º lugar`} onPress={() => onOpenProfile(entry.user_id)} style={styles.podiumTap}>
        <View style={[styles.ring, { borderColor: look.color }]}>
          <Avatar name={nameOf(entry)} uri={entry.avatar_url} size={look.avatar} />
        </View>
        <Text numberOfLines={1} style={[styles.podiumName, { color: nameColorOf(entry.name_style, colors.textStrong) }]}>
          {nameOf(entry)}
        </Text>
        <LevelPill level={entry.level} size="md" />
        <Text style={styles.xp}>{formatXp(entry.xp)}</Text>
      </Pressable>
      <View style={[styles.step, { height: look.step }]}>
        <Text style={[styles.stepText, { color: look.color }]}>{positionLabel(place)}</Text>
      </View>
    </View>
  )
}

function Row({ entry, isMe, onOpenProfile }: { entry: RankingEntry; isMe: boolean; onOpenProfile: (id: string) => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${positionLabel(entry.position)} ${nameOf(entry)}`} onPress={() => onOpenProfile(entry.user_id)} style={[styles.row, isMe && styles.rowMe]}>
      <Text style={styles.position}>{positionLabel(entry.position)}</Text>
      <Avatar name={nameOf(entry)} uri={entry.avatar_url} size={36} />
      <Text numberOfLines={1} style={[styles.rowName, { color: nameColorOf(entry.name_style, colors.textStrong) }]}>
        {nameOf(entry)}
      </Text>
      <Text style={styles.xp}>{formatXp(entry.xp)}</Text>
      <LevelPill level={entry.level} size="md" />
    </Pressable>
  )
}

function Body({ ranking, onOpenProfile }: { ranking: Ranking; onOpenProfile: (id: string) => void }) {
  const { podium, rest } = splitRanking(ranking.entries)
  return (
    <>
      <View accessibilityLabel="Pódio" style={styles.podium}>
        {podiumSlots(podium).map((slot) => (
          <Podium key={slot.entry.user_id} slot={slot} onOpenProfile={onOpenProfile} />
        ))}
      </View>
      <View accessibilityLabel="Classificação">
        {rest.map((entry) => (
          <Row key={entry.user_id} entry={entry} isMe={entry.position === ranking.me?.position} onOpenProfile={onOpenProfile} />
        ))}
      </View>
    </>
  )
}

/** Faixa fixa no pé: "Sua posição: #N", mesmo fora do top 100. */
function MyRankBar({ me }: { me: MyRank | null }) {
  return (
    <View accessibilityRole="summary" style={styles.myBar}>
      <Text numberOfLines={1} style={styles.myText}>
        {myPositionText(me)}
      </Text>
      {me ? (
        <View style={styles.myRight}>
          <Text style={styles.xp}>{formatXp(me.xp)}</Text>
          <LevelPill level={me.level} size="md" />
        </View>
      ) : null}
    </View>
  )
}

interface ContentProps {
  ranking: Ranking | null
  loading: boolean
  error: string | null
  onRetry: () => void
  onOpenProfile: (userId: string) => void
}

function Retry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorRow}>
      <Text accessibilityRole="alert" style={styles.error}>
        {message}
      </Text>
      <Button title="Tentar de novo" variant="secondary" onPress={onRetry} />
    </View>
  )
}

/** O que a lista mostra em cada estado: carregando, erro sem dados, vazio ou o ranking (com erro por cima, se recarregou mal). */
function Content({ ranking, loading, error, onRetry, onOpenProfile }: ContentProps) {
  if (loading) return <ActivityIndicator testID="ranking-loading" color={colors.brand} />
  if (!ranking) return <Retry message={error ?? 'Não foi possível carregar o ranking.'} onRetry={onRetry} />
  if (ranking.entries.length === 0) return <Text style={styles.empty}>Ninguém no ranking ainda. Entre numa call e seja o primeiro!</Text>
  return (
    <>
      {error ? <Retry message={error} onRetry={onRetry} /> : null}
      <Body ranking={ranking} onOpenProfile={onOpenProfile} />
    </>
  )
}

interface RankingScreenProps {
  onBack: () => void
  onOpenProfile: (userId: string) => void
}

/** Rank global (a tela "Rank global" da aba do diamante): pódio, classificação e a sua posição. */
export function RankingScreen({ onBack, onOpenProfile }: RankingScreenProps) {
  const ranking = useRankingStore((s) => s.ranking)
  const loading = useRankingStore((s) => s.loading)
  const error = useRankingStore((s) => s.error)
  const fetch = useRankingStore((s) => s.fetch)
  useEffect(() => {
    void fetch()
  }, [fetch])

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" label="Voltar" onPress={onBack} />
        <Text accessibilityRole="header" style={styles.title}>
          Rank global
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Content ranking={ranking} loading={loading} error={error} onRetry={() => void fetch()} onOpenProfile={onOpenProfile} />
      </ScrollView>
      {ranking && ranking.entries.length > 0 ? <MyRankBar me={ranking.me} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  title: { color: colors.textStrong, fontSize: fontSize.lg, fontWeight: '700' },
  content: { gap: spacing.lg, padding: spacing.lg },
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  podiumItem: { flex: 1, minWidth: 0, justifyContent: 'flex-end' },
  podiumTap: { minHeight: MIN_TOUCH, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  ring: { borderRadius: 999, borderWidth: 2, padding: 2 },
  podiumName: { fontSize: fontSize.sm, fontWeight: '600', maxWidth: '100%' },
  xp: { color: colors.textMuted, fontSize: fontSize.xs },
  step: { alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  stepText: { fontSize: fontSize.xl, fontWeight: '900' },
  row: { minHeight: MIN_TOUCH + 4, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md },
  rowMe: { backgroundColor: 'rgba(139,92,246,0.1)' },
  position: { width: 40, textAlign: 'right', color: colors.textMuted, fontSize: fontSize.sm, fontWeight: '700' },
  rowName: { flex: 1, fontSize: fontSize.sm, fontWeight: '600' },
  errorRow: { gap: spacing.md, alignItems: 'flex-start' },
  error: { color: colors.textDanger, fontSize: fontSize.sm },
  empty: { color: colors.textMuted, fontSize: fontSize.sm },
  myBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderSubtle, backgroundColor: colors.bgSecondary },
  myText: { flex: 1, color: colors.textStrong, fontSize: fontSize.sm, fontWeight: '700' },
  myRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }
})
