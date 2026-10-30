import { StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native'
import { colors, fontSize, radius, spacing } from '../../../shared/theme/tokens'
import { IconButton } from '../../../shared/ui/IconButton'
import { ModalSheet } from '../../../shared/ui/ModalSheet'
import { SwitchRow } from '../../../shared/ui/SwitchRow'
import type { CallUser } from '../lib/callTypes'
import { DEFAULT_USER_AUDIO, stepVolume, volumePercent } from '../lib/userVolume'
import { useUserAudioStore } from '../store/userAudioStore'

interface UserAudioSheetProps {
  user: CallUser
  onClose: () => void
}

const ACTIONS = [{ name: 'increment' }, { name: 'decrement' }]

/** Volume e "silenciar" de uma pessoa da chamada, só para mim (abre ao tocar no tile dela). */
export function UserAudioSheet({ user, onClose }: UserAudioSheetProps) {
  const audio = useUserAudioStore((s) => s.settings[user.id] ?? DEFAULT_USER_AUDIO)
  const setVolume = useUserAudioStore((s) => s.setVolume)
  const toggleMuted = useUserAudioStore((s) => s.toggleMuted)
  const step = (direction: 1 | -1): void => setVolume(user.id, stepVolume(audio.volume, direction))
  const onAction = (e: AccessibilityActionEvent): void => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)
  const percent = volumePercent(audio.volume)

  return (
    <ModalSheet title={user.display_name} onClose={onClose}>
      <SwitchRow title="Silenciar para mim" description="Só você deixa de ouvir. Ninguém fica sabendo." value={audio.muted} onChange={() => toggleMuted(user.id)} />
      <View style={styles.block}>
        <Text style={styles.label}>Volume do usuário</Text>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`Volume de ${user.display_name}`}
          accessibilityValue={{ text: percent }}
          accessibilityActions={ACTIONS}
          onAccessibilityAction={onAction}
          style={styles.row}
        >
          <IconButton icon="remove" label="Diminuir volume" onPress={() => step(-1)} />
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${audio.volume * 100}%` }, audio.muted && styles.fillMuted]} />
          </View>
          <IconButton icon="add" label="Aumentar volume" onPress={() => step(1)} />
          <Text style={styles.percent}>{percent}</Text>
        </View>
      </View>
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  label: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  track: { flex: 1, height: 8, borderRadius: radius.pill, backgroundColor: colors.bgAccent, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.brand },
  fillMuted: { backgroundColor: colors.interactiveMuted },
  percent: { width: 48, textAlign: 'right', color: colors.textNormal, fontSize: fontSize.sm, fontVariant: ['tabular-nums'] }
})
