import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../../../shared/theme/tokens'
import { formatVoiceTime, levelPercent, levelTier, minutesToNext } from '../lib/levels'
import { useLevelStore } from '../store/levelStore'

/** Barra de XP de quem está logado, na chamada (a do "Voz conectada" do desktop). Pausada, fica cinza. */
export function XpBar({ paused }: { paused: boolean }) {
  const me = useLevelStore((s) => s.me)
  if (!me) return null
  const tier = levelTier(me.level)
  const percent = levelPercent(me.xp_into_level, me.xp_for_next)
  const minutes = minutesToNext(me.xp_into_level, me.xp_for_next)
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      accessibilityLabel={`Nível ${me.level}. ${formatVoiceTime(me.voice_seconds)} de call no total, faltam cerca de ${minutes} min para o nível ${me.level + 1}.`}
      style={styles.box}
    >
      <View style={styles.row}>
        <Text style={[styles.level, { color: paused ? colors.textFaint : tier.color }]}>Nível {me.level}</Text>
        <Text style={styles.xp}>{paused ? 'XP pausado (mutado)' : `${me.xp_into_level}/${me.xp_for_next} XP`}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: paused ? '#4b5563' : tier.color }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { gap: 4, paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  level: { fontSize: 11, fontWeight: '700' },
  xp: { color: colors.textFaint, fontSize: 10 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
  fill: { height: '100%', borderRadius: 3 }
})
