import { Canvas, Picture } from '@shopify/react-native-skia'
import { StyleSheet } from 'react-native'
import type { EffectParams } from '../../lib/effects/types'
import { useEffectsFocused } from '../EffectsFocus'
import { NonInteractive } from './NonInteractive'
import { useAppActive, useReduceMotion } from '../../hooks/pauseSignals'
import { useEffectPicture, type EffectMode } from '../../hooks/useEffectPicture'

interface EffectCanvasProps {
  effect: string
  params: EffectParams
  width: number
  height: number
}

/** O efeito animado do tema por cima do cartão (camada não interativa: os links continuam tocáveis). */
export function EffectCanvas({ effect, params, width, height }: EffectCanvasProps) {
  const focused = useEffectsFocused()
  const appActive = useAppActive()
  const reduceMotion = useReduceMotion()
  // "Reduzir movimento" ganha da pausa: o quadro parado continua valendo.
  const mode: EffectMode = reduceMotion ? 'still' : focused && appActive ? 'run' : 'pause'
  const picture = useEffectPicture(effect, params, width, height, mode)
  if (!picture) return null
  return (
    <NonInteractive testID="card-effect">
      <Canvas style={StyleSheet.absoluteFill}>
        <Picture picture={picture} />
      </Canvas>
    </NonInteractive>
  )
}
