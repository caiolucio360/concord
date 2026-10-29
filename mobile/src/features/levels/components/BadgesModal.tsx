import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontSize, MIN_TOUCH, radius, spacing } from '../../../shared/theme/tokens'
import { IconButton } from '../../../shared/ui/IconButton'
import type { Badge } from '../api/badges'
import { badgeLabel, formatThreshold, formatUnlockDate, progressPercent, publicStatText, rarityMeta, remainingText, selectedBadge, statText, visibleBadges } from '../lib/badges'
import { HIDDEN_BADGES_HINT, hiddenBadgesTitle } from '../lib/hiddenBadges'
import { useBadgeStore, type BadgesModalTarget } from '../store/badgeStore'
import { BadgeIcon } from './BadgeIcon'

function Detail({ badge, self }: { badge: Badge; self: boolean }) {
  const meta = rarityMeta(badge.rarity)
  const unlocked = formatUnlockDate(badge.unlocked_at)
  return (
    <View style={styles.detail}>
      <BadgeIcon category={badge.category} tier={badge.tier} rarity={badge.rarity} size={96} />
      <Text accessibilityRole="header" style={[styles.detailTitle, { color: meta.color }]}>
        {badge.tier_name ?? badge.name}
      </Text>
      <Text style={styles.detailName}>{badge.name}</Text>
      <Text style={styles.description}>{badge.description}</Text>
      <Text style={styles.stat}>
        {self ? statText(badge) : publicStatText(badge)}
        {unlocked ? ` • Desbloqueado em ${unlocked}` : ''} • {meta.label.toUpperCase()}
      </Text>
      {self && badge.progress !== undefined ? (
        <View style={styles.progress}>
          <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progressPercent(badge) }} style={styles.bar}>
            <View style={[styles.barFill, { width: `${progressPercent(badge)}%`, backgroundColor: meta.color }]} />
          </View>
          <Text style={styles.remaining}>{remainingText(badge)}</Text>
        </View>
      ) : null}
      <View style={styles.ladder}>
        {badge.tiers.map((t) => (
          <Text key={t.tier} style={[styles.rung, t.tier <= badge.tier ? styles.rungOn : null]}>
            {t.tier <= badge.tier ? '✓' : '·'} {t.name} · {formatThreshold(badge.unit, t.threshold, badge.category)}
          </Text>
        ))}
      </View>
    </View>
  )
}

function ModalBody({ target, onClose }: { target: BadgesModalTarget; onClose: () => void }) {
  const entry = useBadgeStore((s) => s.byUser[target.userId])
  const [picked, setPicked] = useState<{ target: BadgesModalTarget; category: string } | null>(null)
  const visible = visibleBadges(entry?.badges)
  const current = selectedBadge(visible, target, picked)
  const hidden = hiddenBadgesTitle(entry?.hiddenRemaining)
  const self = entry?.badges.some((b) => b.value !== undefined) ?? false
  return (
    <>
      <View style={styles.header}>
        <Text style={styles.heading}>Badges de {target.name}</Text>
        <IconButton icon="close" label="Fechar" onPress={onClose} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {visible.length === 0 ? <Text style={styles.empty}>Nenhum badge ainda.</Text> : null}
        <View style={styles.grid}>
          {visible.map((b) => (
            <Pressable
              key={b.category}
              accessibilityRole="button"
              accessibilityLabel={badgeLabel(b)}
              accessibilityState={{ selected: current?.category === b.category }}
              onPress={() => setPicked({ target, category: b.category })}
              style={[styles.cell, current?.category === b.category && styles.cellOn]}
            >
              <BadgeIcon category={b.category} tier={b.tier} rarity={b.rarity} size={44} />
            </Pressable>
          ))}
        </View>
        {current ? <Detail badge={current} self={self} /> : null}
        {hidden ? (
          <View style={styles.hidden}>
            <Text style={styles.hiddenTitle}>{hidden}</Text>
            <Text style={styles.hiddenHint}>{HIDDEN_BADGES_HINT}</Text>
          </View>
        ) : null}
      </ScrollView>
    </>
  )
}

/** Modal de badges (folha de baixo): a grade dos conquistados e o detalhe do escolhido, como no desktop. */
export function BadgesModal() {
  const target = useBadgeStore((s) => s.modal)
  const close = useBadgeStore((s) => s.closeModal)
  const { bottom } = useSafeAreaInsets()
  if (!target) return null
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Fechar badges" />
      <View style={[styles.sheet, { paddingBottom: Math.max(spacing.md, bottom) }]}>
        <ModalBody target={target} onClose={close} />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { maxHeight: '85%', backgroundColor: colors.bgFloating, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { flex: 1, color: colors.textStrong, fontSize: fontSize.md, fontWeight: '700' },
  content: { gap: spacing.lg, paddingBottom: spacing.md },
  empty: { color: colors.textMuted, fontSize: fontSize.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { width: MIN_TOUCH + 8, height: MIN_TOUCH + 8, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: 'transparent' },
  cellOn: { borderColor: colors.brand, backgroundColor: 'rgba(88,101,242,0.15)' },
  detail: { alignItems: 'center', gap: spacing.xs },
  detailTitle: { fontSize: fontSize.lg, fontWeight: '800' },
  detailName: { color: colors.textMuted, fontSize: fontSize.xs },
  description: { color: colors.textNormal, fontSize: fontSize.sm, textAlign: 'center' },
  stat: { color: colors.textSecondary, fontSize: fontSize.xs, textAlign: 'center' },
  progress: { alignSelf: 'stretch', gap: spacing.xs, marginTop: spacing.sm },
  bar: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
  barFill: { height: '100%' },
  remaining: { color: colors.textMuted, fontSize: fontSize.xs, textAlign: 'center' },
  ladder: { alignSelf: 'stretch', gap: 2, marginTop: spacing.sm },
  rung: { color: colors.textFaint, fontSize: fontSize.xs },
  rungOn: { color: colors.textNormal },
  hidden: { padding: spacing.md, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.04)', gap: 2 },
  hiddenTitle: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600' },
  hiddenHint: { color: colors.textFaint, fontSize: fontSize.xs }
})
