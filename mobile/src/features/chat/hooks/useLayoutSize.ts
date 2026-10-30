import { useState } from 'react'
import { useWindowDimensions, type LayoutChangeEvent } from 'react-native'

interface Size {
  width: number
  height: number
}

/**
 * Tamanho real de uma view (pelo onLayout); até a primeira medida, o da janela.
 * No Modal com statusBarTranslucent a área pode não ser a da janela.
 */
export function useLayoutSize() {
  const window = useWindowDimensions()
  const [measured, setMeasured] = useState<Size | null>(null)
  const onLayout = (e: LayoutChangeEvent) => setMeasured({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
  const size: Size = measured ?? { width: window.width, height: window.height }
  return { size, onLayout }
}
