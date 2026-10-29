import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, MIN_TOUCH, radius, spacing } from '../../../shared/theme/tokens'
import { badgeLabel, profileBadgeRow } from '../lib/badges'
import { useBadgeStore } from '../store/badgeStore'
import { BadgeIcon } from './BadgeIcon'

interface BadgeRowProps {
  userId: string
  name: string
  max?: number
}

/**
 * Fileira de badges do cartão, como no desktop: os mais raros primeiro, até `max` ícones e "+N". Tocar num
 * ícone abre o modal de badges já nele (o desktop mostra a dica ao passar o mouse; no toque o modal faz isso).
 */
export function BadgeRow({ userId, name, max = 6 }: BadgeRowProps) {
  const badges = useBadgeStore((s) => s.byUser[userId]?.badges)
  const ensureBadges = useBadgeStore((s) => s.ensureBadges)
  const openModal = useBadgeStore((s) => s.openModal)
  const [, setSettled] = useState(false)

  useEffect(() => {
    let cancelled = false
    void ensureBadges(userId).then(() => !cancelled && setSettled(true))
    return () => {
      cancelled = true
    }
  }, [userId, ensureBadges])

  if (!badges) return null
  const { shown, overflow } = profileBadgeRow(badges, max)
  if (shown.length === 0) return null
  const open = (category?: string): void => openModal({ userId, name, category })

  return (
    <View accessibilityLabel="Badges" style={styles.row}>
      {shown.map((b) => (
        <Pressable key={b.category} accessibilityRole="button" accessibilityLabel={badgeLabel(b)} onPress={() => open(b.category)} style={styles.item}>
          <BadgeIcon category={b.category} tier={b.tier} rarity={b.rarity} size={24} />
        </Pressable>
      ))}
      {overflow > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Ver mais ${overflow} badges`} onPress={() => open()} style={styles.item}>
          <Text style={styles.more}>+{overflow}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignSelf: 'flex-start', flexWrap: 'wrap', alignItems: 'center', gap: 2, paddingHorizontal: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.bgInput },
  item: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  more: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' }
})
