import { Image, Modal, StyleSheet, useWindowDimensions, View } from 'react-native'
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated from 'react-native-reanimated'
import { IconButton } from '../../../shared/ui/IconButton'
import { useZoomGestures } from '../hooks/useZoomGestures'
import { containSize, ZOOM_STEP } from '../lib/imageZoom'
import { ZoomBar } from './ZoomBar'

interface MediaLightboxProps {
  src: string
  label: string
  onClose: () => void
  /** Dimensões do anexo, para o arraste parar na borda da imagem (sem elas, a tela inteira). */
  width?: number | null
  height?: number | null
}

/**
 * Imagem em tela cheia: pinça, arraste, duplo toque e a barra dão zoom. Tocar na
 * imagem em 1x ou no X fecha; o botão voltar do Android também.
 */
export function MediaLightbox({ src, label, onClose, width, height }: MediaLightboxProps) {
  const view = useWindowDimensions()
  const size = containSize(width, height, view.width, view.height)
  const zoom = useZoomGestures({ ...size, viewWidth: view.width, viewHeight: view.height }, onClose)
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* No Android o Modal fica fora da raiz do app: precisa da própria raiz de gestos. */}
      <GestureHandlerRootView style={styles.backdrop}>
        <GestureDetector gesture={zoom.gesture}>
          <View style={styles.fill} accessible accessibilityRole="button" accessibilityLabel="Fechar imagem" onAccessibilityTap={onClose}>
            <Animated.View style={[styles.fill, zoom.animatedStyle]}>
              <Image source={{ uri: src }} accessibilityLabel={label} style={styles.fill} resizeMode="contain" />
            </Animated.View>
          </View>
        </GestureDetector>
        <View style={styles.close}>
          <IconButton icon="close" label="Fechar" onPress={onClose} />
        </View>
        <ZoomBar scale={zoom.level} onZoomOut={() => zoom.zoomBy(1 / ZOOM_STEP)} onZoomIn={() => zoom.zoomBy(ZOOM_STEP)} onReset={zoom.reset} />
      </GestureHandlerRootView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  fill: { width: '100%', height: '100%' },
  close: { position: 'absolute', top: 40, right: 12 }
})
