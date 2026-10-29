import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, radius, spacing } from '../../../shared/theme/tokens'
import { Avatar } from '../../../shared/ui/Avatar'
import type { CallUser, VoiceState } from '../lib/callTypes'

interface ParticipantTileProps {
  user: CallUser
  speaking: boolean
  voice: VoiceState
  /** Está transmitindo a tela: mostra o "Ao vivo" e, se der para assistir, o botão. */
  live?: boolean
  onWatch?: () => void
}

function stateOf(speaking: boolean, voice: VoiceState): string {
  if (voice.deafened || voice.serverDeafened) return 'ensurdecido'
  if (voice.muted || voice.serverMuted) return 'mudo'
  return speaking ? 'falando' : ''
}

/** Uma pessoa na grade da chamada: foto, nome, anel verde quando fala e ícone de mudo ou fone. */
export function ParticipantTile({ user, speaking, voice, live = false, onWatch }: ParticipantTileProps) {
  const state = stateOf(speaking, voice)
  const off = state === 'mudo' || state === 'ensurdecido'
  return (
    <View accessible accessibilityLabel={state ? `${user.display_name}, ${state}` : user.display_name} style={[styles.tile, speaking && !off && styles.speaking]}>
      <Avatar name={user.display_name} uri={user.avatar_url} size={64} />
      <View style={styles.row}>
        {off ? <Ionicons name={state === 'mudo' ? 'mic-off' : 'volume-mute'} size={14} color={colors.textDanger} /> : null}
        <Text style={styles.name} numberOfLines={1}>
          {user.display_name}
        </Text>
      </View>
      {live ? <LiveBadge name={user.display_name} onWatch={onWatch} /> : null}
    </View>
  )
}

/** "Ao vivo" de quem transmite a tela; com onWatch vira o botão Assistir. */
function LiveBadge({ name, onWatch }: { name: string; onWatch?: () => void }) {
  if (!onWatch) return <Text style={styles.live}>● Ao vivo</Text>
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Assistir à tela de ${name}`} onPress={onWatch} style={styles.watch}>
      <Text style={styles.watchText}>● Ao vivo · Assistir</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tile: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, minHeight: 120, backgroundColor: colors.bgSurface, borderRadius: radius.lg, borderWidth: 2, borderColor: 'transparent' },
  speaking: { borderColor: colors.green },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '100%' },
  name: { color: colors.textStrong, fontSize: fontSize.sm, fontWeight: '600', flexShrink: 1 },
  live: { color: colors.textDanger, fontSize: fontSize.xs, fontWeight: '700' },
  watch: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.red },
  watchText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '700' }
})
