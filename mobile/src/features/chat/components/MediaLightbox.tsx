import { Image, Modal, Pressable, StyleSheet, View } from 'react-native'
import { IconButton } from '../../../shared/ui/IconButton'

interface MediaLightboxProps {
  src: string
  label: string
  onClose: () => void
}

/** Imagem em tela cheia (tocar fora ou no X fecha; o botão voltar do Android também). */
export function MediaLightbox({ src, label, onClose }: MediaLightboxProps) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar imagem">
        <Image source={{ uri: src }} accessibilityLabel={label} style={styles.image} resizeMode="contain" />
      </Pressable>
      <View style={styles.close}>
        <IconButton icon="close" label="Fechar" onPress={onClose} />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  close: { position: 'absolute', top: 40, right: 12 }
})
