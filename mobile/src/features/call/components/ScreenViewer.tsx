import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, spacing } from '../../../shared/theme/tokens'
import { Button } from '../../../shared/ui/Button'

interface ScreenViewerProps {
  /** Nome de quem transmite. */
  name: string
  userId: string
  onStop: () => void
  /** Desenha a transmissão (o componente do LiveKit entra por aqui; nos testes é um falso). */
  renderScreen: (userId: string) => ReactNode
}

/** A transmissão de tela que estou assistindo, no topo da chamada, com o botão de parar de assistir. */
export function ScreenViewer({ name, userId, onStop, renderScreen }: ScreenViewerProps) {
  return (
    <View style={styles.box}>
      {renderScreen(userId)}
      <View style={styles.bar}>
        <Text style={styles.text} numberOfLines={1}>
          Assistindo a {name}
        </Text>
        <Button title="Parar de assistir" variant="secondary" onPress={onStop} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#000' },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, padding: spacing.sm, backgroundColor: colors.bgSurface },
  text: { flex: 1, color: colors.textStrong, fontSize: fontSize.sm, fontWeight: '600' }
})
