import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

interface NonInteractiveProps {
  testID: string
  children: ReactNode
}

/**
 * Camada decorativa sobre ou sob o conteúdo do cartão: não recebe toque (os links continuam tocáveis) e não
 * aparece para o leitor de tela. É um View, e não só props no Canvas, para não depender de como o Skia trata
 * pointerEvents na view nativa.
 */
export function NonInteractive({ testID, children }: NonInteractiveProps) {
  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      {children}
    </View>
  )
}
