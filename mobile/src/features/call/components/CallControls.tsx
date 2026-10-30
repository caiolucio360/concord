import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, View } from 'react-native'
import { colors, radius, spacing } from '../../../shared/theme/tokens'
import { useVoiceControlsStore } from '../../voice/store/voiceControlsStore'

interface RoundButtonProps {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
  /** Estado ligado de um botão de liga/desliga (mudo, ensurdecido, transmitindo): fica claro e destacado. */
  active?: boolean
  /** Sair da chamada: vermelho cheio. */
  hangup?: boolean
}

/** Botão redondo da barra da chamada (56 dp, acima dos 44 dp de alvo de toque). */
function RoundButton({ icon, label, onPress, active = false, hangup = false }: RoundButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.button, active && styles.active, hangup && styles.hangup, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={24} color={hangup ? colors.white : active ? colors.bgApp : colors.textNormal} style={hangup ? styles.hangupIcon : undefined} />
    </Pressable>
  )
}

interface CallControlsProps {
  sharing: boolean
  /** Liga ou desliga a transmissão da minha tela; sem ele o botão não aparece. */
  onToggleShare?: () => void
  onLeave: () => void
}

/** Barra de baixo da chamada, como no Discord: microfone, fone, compartilhar tela e sair, em botões redondos. */
export function CallControls({ sharing, onToggleShare, onLeave }: CallControlsProps) {
  const muted = useVoiceControlsStore((s) => s.muted)
  const deafened = useVoiceControlsStore((s) => s.deafened)
  const toggleMute = useVoiceControlsStore((s) => s.toggleMute)
  const toggleDeafen = useVoiceControlsStore((s) => s.toggleDeafen)
  return (
    <View style={styles.bar}>
      <RoundButton icon={muted ? 'mic-off' : 'mic'} label={muted ? 'Ativar microfone' : 'Silenciar microfone'} active={muted} onPress={() => void toggleMute()} />
      <RoundButton icon={deafened ? 'volume-mute' : 'headset'} label={deafened ? 'Desensurdecer' : 'Ensurdecer'} active={deafened} onPress={() => void toggleDeafen()} />
      {onToggleShare ? (
        <RoundButton icon={sharing ? 'stop-circle' : 'tv-outline'} label={sharing ? 'Parar de compartilhar a tela' : 'Compartilhar tela'} active={sharing} onPress={onToggleShare} />
      ) : null}
      <RoundButton icon="call" label="Sair da chamada" hangup onPress={onLeave} />
    </View>
  )
}

const SIZE = 56

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.md, paddingVertical: spacing.md, borderRadius: 32, backgroundColor: colors.bgSurface },
  button: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgAccent },
  active: { backgroundColor: colors.white },
  hangup: { backgroundColor: colors.redStrong, borderRadius: radius.pill },
  hangupIcon: { transform: [{ rotate: '135deg' }] },
  pressed: { opacity: 0.75 }
})
