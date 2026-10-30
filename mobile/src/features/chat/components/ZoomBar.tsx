import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, View } from 'react-native'
import { colors, MIN_TOUCH, radius, spacing } from '../../../shared/theme/tokens'
import { zoomLimit } from '../lib/imageZoom'

interface ZoomBarProps {
  scale: number
  onZoomOut: () => void
  onZoomIn: () => void
}

/** Barra de zoom do lightbox: só os ícones − e + (desativados em 1x e 5x). */
export function ZoomBar({ scale, onZoomOut, onZoomIn }: ZoomBarProps) {
  const limit = zoomLimit(scale)
  return (
    <View style={styles.bar}>
      <BarButton label="Diminuir zoom" disabled={limit === 'min'} onPress={onZoomOut}>
        <Ionicons name="remove" size={22} color={colors.textNormal} />
      </BarButton>
      <BarButton label="Aumentar zoom" disabled={limit === 'max'} onPress={onZoomIn}>
        <Ionicons name="add" size={22} color={colors.textNormal} />
      </BarButton>
    </View>
  )
}

interface BarButtonProps {
  label: string
  disabled: boolean
  onPress: () => void
  children: React.ReactNode
}

function BarButton({ label, disabled, onPress, children }: BarButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: spacing.xxl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.7)'
  },
  button: {
    height: MIN_TOUCH,
    minWidth: MIN_TOUCH,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pressed: { backgroundColor: 'rgba(255,255,255,0.15)' },
  disabled: { opacity: 0.4 }
})
