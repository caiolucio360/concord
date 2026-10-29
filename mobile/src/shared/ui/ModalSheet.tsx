import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontSize, spacing } from '../theme/tokens'
import { IconButton } from './IconButton'

interface ModalSheetProps {
  title: string
  /** Sem ele (ex.: salvando) o modal não fecha por toque fora, voltar ou X. */
  onClose?: () => void
  children: ReactNode
}

/** Modal do celular: folha de baixo com título e X (os modais do desktop viram folhas no celular). */
export function ModalSheet({ title, onClose, children }: ModalSheetProps) {
  const { bottom } = useSafeAreaInsets()
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={`Fechar ${title}`} />
        <View style={[styles.sheet, { paddingBottom: Math.max(spacing.md, bottom) }]}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            {onClose ? <IconButton icon="close" label="Fechar" onPress={onClose} /> : null}
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { maxHeight: '90%', backgroundColor: colors.bgFloating, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, color: colors.textStrong, fontSize: fontSize.lg, fontWeight: '700' },
  body: { gap: spacing.lg, paddingVertical: spacing.md }
})
