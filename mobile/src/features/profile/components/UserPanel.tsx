import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, MIN_TOUCH, radius, spacing } from '../../../shared/theme/tokens'
import { Avatar } from '../../../shared/ui/Avatar'
import { IconButton } from '../../../shared/ui/IconButton'
import { useAuthStore } from '../../auth/store/authStore'
import { VoiceControls } from '../../voice/components/VoiceControls'

interface UserPanelProps {
  onOpenSettings: () => void
  /** Tocar na foto ou no nome abre o perfil de quem está logado. Sem ele, não é um botão. */
  onOpenProfile?: (userId: string) => void
}

/** Painel de baixo: quem está logado (toque abre o perfil), microfone, fone e engrenagem. */
export function UserPanel({ onOpenSettings, onOpenProfile }: UserPanelProps) {
  const user = useAuthStore((s) => s.user)
  return (
    <View style={styles.panel}>
      {user ? (
        <Who name={user.display_name} onPress={onOpenProfile ? () => onOpenProfile(user.id) : undefined}>
          <Avatar name={user.display_name} uri={user.avatar_url} size={36} />
          <View style={styles.names}>
            <Text style={styles.name} numberOfLines={1}>
              {user.display_name}
            </Text>
            <Text style={styles.username} numberOfLines={1}>
              @{user.username}
            </Text>
          </View>
        </Who>
      ) : (
        <View style={styles.names} />
      )}
      <VoiceControls />
      <IconButton icon="settings-sharp" label="Configurações" onPress={onOpenSettings} />
    </View>
  )
}

/** A área da foto e do nome: botão (alvo de 44 dp) quando há o que abrir. */
function Who({ name, onPress, children }: { name: string; onPress?: () => void; children: ReactNode }) {
  if (!onPress) return <View style={styles.who}>{children}</View>
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={name} onPress={onPress} style={styles.who}>
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: MIN_TOUCH },
  panel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.bgSurface, borderRadius: radius.lg, margin: spacing.sm },
  names: { flex: 1 },
  name: { color: colors.textStrong, fontSize: fontSize.md, fontWeight: '700' },
  username: { color: colors.textMuted, fontSize: fontSize.xs }
})
