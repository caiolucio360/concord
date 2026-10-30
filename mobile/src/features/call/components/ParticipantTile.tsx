import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, radius, spacing } from '../../../shared/theme/tokens'
import { Avatar } from '../../../shared/ui/Avatar'
import { MaestroAvatar } from '../../music/components/MaestroAvatar'
import { callAvatarAnimate } from '../lib/callAvatarMotion'
import type { CallUser, VoiceState } from '../lib/callTypes'

interface ParticipantTileProps {
  user: CallUser
  speaking: boolean
  voice: VoiceState
  /** Está transmitindo a tela: mostra o "Ao vivo" e, se der para assistir, o botão. */
  live?: boolean
  onWatch?: () => void
  /** Altura do tile e lado da foto (vêm da grade da chamada); sem eles, um tile compacto. */
  height?: number
  avatarSize?: number
}

function stateOf(speaking: boolean, voice: VoiceState): string {
  if (voice.deafened || voice.serverDeafened) return 'ensurdecido'
  if (voice.muted || voice.serverMuted) return 'mudo'
  return speaking ? 'falando' : ''
}

/** Anel verde que pulsa em volta do tile de quem está falando. */
function SpeakingRing({ active }: { active: boolean }) {
  const pulse = useRef(new Animated.Value(0.55)).current
  useEffect(() => {
    if (!active) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 650, useNativeDriver: true })
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [active, pulse])
  if (!active) return null
  return <Animated.View pointerEvents="none" testID="speaking-ring" style={[styles.ring, { opacity: pulse }]} />
}

/** Uma pessoa na grade da chamada: foto grande (o GIF anima enquanto fala), nome em selo e estado de mudo ou fone. */
export function ParticipantTile({ user, speaking, voice, live = false, onWatch, height, avatarSize = 64 }: ParticipantTileProps) {
  const state = stateOf(speaking, voice)
  const off = state === 'mudo' || state === 'ensurdecido'
  const talking = speaking && !off
  return (
    <View accessible accessibilityLabel={state ? `${user.display_name}, ${state}` : user.display_name} style={[styles.tile, height ? { height } : styles.compact]}>
      <SpeakingRing active={talking} />
      {user.is_bot ? <MaestroAvatar size={avatarSize} /> : <Avatar name={user.display_name} uri={user.avatar_url} size={avatarSize} animated={callAvatarAnimate({ speaking: talking })} />}
      <View style={styles.nameBadge}>
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
  if (!onWatch) return <Text style={[styles.live, styles.corner]}>● Ao vivo</Text>
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Assistir à tela de ${name}`} onPress={onWatch} style={[styles.watch, styles.corner]}>
      <Text style={styles.watchText}>● Ao vivo · Assistir</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tile: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.md, overflow: 'hidden', backgroundColor: colors.bgSurface, borderRadius: 16 },
  compact: { minHeight: 120 },
  ring: { ...StyleSheet.absoluteFill, borderRadius: 16, borderWidth: 3, borderColor: colors.green },
  nameBadge: { position: 'absolute', left: spacing.sm, bottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, maxWidth: '70%', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.md, backgroundColor: 'rgba(0,0,0,0.55)' },
  name: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600', flexShrink: 1 },
  corner: { position: 'absolute', right: spacing.sm, top: spacing.sm },
  live: { color: colors.white, fontSize: fontSize.xs, fontWeight: '700', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.md, backgroundColor: colors.red, overflow: 'hidden' },
  watch: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.red },
  watchText: { color: colors.white, fontSize: fontSize.xs, fontWeight: '700' }
})
