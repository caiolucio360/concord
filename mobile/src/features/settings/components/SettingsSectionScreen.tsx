import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, spacing } from '../../../shared/theme/tokens'
import { IconButton } from '../../../shared/ui/IconButton'
import { findSection } from '../lib/settingsNav'
import { MyAccountSection } from './account/MyAccountSection'
import { ProfilesSection } from './profile/ProfilesSection'

/** Uma seção das Configurações em tela cheia, com o voltar para a lista (como no Discord mobile). */
export function SettingsSectionScreen({ id, onBack }: { id: string | undefined; onBack: () => void }) {
  const section = findSection(id)
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <IconButton icon="arrow-back" label="Voltar" onPress={onBack} />
        <Text accessibilityRole="header" style={styles.title}>
          {section?.label ?? 'Configurações'}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {section?.id === 'account' ? <MyAccountSection /> : null}
        {section?.id === 'profiles' ? <ProfilesSection /> : null}
        {section ? null : <Text style={styles.empty}>Seção não encontrada.</Text>}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  title: { color: colors.textStrong, fontSize: fontSize.lg, fontWeight: '700' },
  content: { padding: spacing.lg },
  empty: { color: colors.textMuted, fontSize: fontSize.md }
})
