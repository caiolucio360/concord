import { Ionicons } from '@expo/vector-icons'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontSize, MIN_TOUCH, spacing } from '../../../shared/theme/tokens'
import type { PickedFile } from '../lib/attachments'
import { pickDocuments, pickFromCamera, pickFromGallery } from '../lib/pickFiles'

const OPTIONS: { icon: keyof typeof Ionicons.glyphMap; label: string; pick: () => Promise<PickedFile[]> }[] = [
  { icon: 'images', label: 'Fotos e vídeos', pick: pickFromGallery },
  { icon: 'camera', label: 'Câmera', pick: pickFromCamera },
  { icon: 'document', label: 'Arquivos', pick: pickDocuments }
]

interface AttachMenuProps {
  onPicked: (files: PickedFile[]) => void
  onClose: () => void
}

/** Folha de baixo para escolher de onde vem o anexo (galeria, câmera ou arquivos). */
export function AttachMenu({ onPicked, onClose }: AttachMenuProps) {
  const { bottom } = useSafeAreaInsets()

  async function choose(pick: () => Promise<PickedFile[]>): Promise<void> {
    onClose()
    try {
      onPicked(await pick())
    } catch {
      // seletor indisponível ou fechado de forma anormal: nada a anexar
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar menu de anexos" />
      <View style={[styles.sheet, { paddingBottom: Math.max(spacing.md, bottom) }]}>
        {OPTIONS.map((o) => (
          <Pressable key={o.label} accessibilityRole="button" accessibilityLabel={o.label} onPress={() => void choose(o.pick)} style={styles.row}>
            <Ionicons name={o.icon} size={22} color={colors.textBrand} />
            <Text style={styles.label}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: colors.bgFloating, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.md },
  row: { minHeight: MIN_TOUCH + 8, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm },
  label: { color: colors.textNormal, fontSize: fontSize.md }
})
