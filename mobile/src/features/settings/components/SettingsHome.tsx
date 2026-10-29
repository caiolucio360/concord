import { Ionicons } from '@expo/vector-icons'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, MIN_TOUCH, radius, spacing } from '../../../shared/theme/tokens'
import { Button } from '../../../shared/ui/Button'
import { IconButton } from '../../../shared/ui/IconButton'
import { logout as logoutRequest } from '../../auth/api/auth'
import { useAuthStore } from '../../auth/store/authStore'
import { callController } from '../../call/lib/callRuntime'
import { pushRegistration } from '../../notifications/lib/pushSession'
import { groupedSections, type SettingsSectionId } from '../lib/settingsNav'

interface SettingsHomeProps {
  onBack: () => void
  onOpenSection: (id: SettingsSectionId) => void
  logout?: () => Promise<void>
  /** Tira o aparelho do push desta conta; precisa rodar antes de a sessão acabar. */
  forgetPush?: () => Promise<void>
  /** Sai da chamada em andamento; também precisa rodar antes de a sessão acabar. */
  leaveCall?: () => Promise<void>
}

/** Tela de Configurações no celular: a lista de seções (uma abre por vez) e o botão Sair. */
export function SettingsHome({ onBack, onOpenSection, logout = logoutRequest, forgetPush = pushRegistration.forget, leaveCall = callController.leave }: SettingsHomeProps) {
  async function signOut(): Promise<void> {
    await leaveCall().catch(() => {})
    await forgetPush().catch(() => {})
    // Avisa o servidor, mas sair do aparelho não depende dele estar no ar.
    await logout().catch(() => {})
    await useAuthStore.getState().signOut()
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" label="Voltar" onPress={onBack} />
        <Text accessibilityRole="header" style={styles.title}>
          Configurações
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {groupedSections().map((group) => (
          <View key={group.id} style={styles.group}>
            <Text style={styles.groupTitle}>{group.label}</Text>
            <View style={styles.list}>
              {group.sections.map((s) => (
                <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={s.label} onPress={() => onOpenSection(s.id)} style={styles.row}>
                  <Text style={styles.rowText}>{s.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.interactiveNormal} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        <Button title="Sair" variant="danger" onPress={signOut} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  title: { color: colors.textStrong, fontSize: fontSize.lg, fontWeight: '700' },
  content: { gap: spacing.xl, padding: spacing.lg },
  group: { gap: spacing.sm },
  groupTitle: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase' },
  list: { borderRadius: radius.md, backgroundColor: colors.bgInput, overflow: 'hidden' },
  row: { minHeight: MIN_TOUCH + 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  rowText: { color: colors.textNormal, fontSize: fontSize.md }
})
