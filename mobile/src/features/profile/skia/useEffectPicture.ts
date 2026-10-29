import { Skia, type SkPicture } from '@shopify/react-native-skia'
import { useEffect, useState } from 'react'
import { useSharedValue, type SharedValue } from 'react-native-reanimated'
import { canvasScene } from '../lib/effects'
import { createEffectLoop } from '../lib/effects/loop'
import type { EffectParams } from '../lib/effects/types'
import { createSkiaCtx } from './skiaCtx'

/** run: anima a ~30 fps; pause: para (app em segundo plano, tela sem foco); still: um quadro só (reduzir movimento). */
export type EffectMode = 'run' | 'pause' | 'still'

interface Env {
  raf: (cb: (time: number) => void) => number
  caf: (id: number) => void
}

const DEFAULT_ENV: Env = { raf: (cb) => requestAnimationFrame(cb), caf: (id) => cancelAnimationFrame(id) }

function emptyPicture(): SkPicture {
  const recorder = Skia.PictureRecorder()
  recorder.beginRecording(Skia.XYWHRect(0, 0, 1, 1))
  return recorder.finishRecordingAsPicture()
}

/**
 * Roda o efeito do tema e devolve a picture que o `<Picture>` do Skia mostra (sem re-render do React por
 * quadro). `null` quando o efeito não existe ou o cartão ainda não tem tamanho.
 */
export function useEffectPicture(
  effect: string,
  params: EffectParams,
  width: number,
  height: number,
  mode: EffectMode,
  env: Env = DEFAULT_ENV
): SharedValue<SkPicture> | null {
  const [initial] = useState(emptyPicture)
  const picture = useSharedValue<SkPicture>(initial)
  const scene = canvasScene(effect)
  const valid = scene !== null && width > 0 && height > 0

  useEffect(() => {
    if (!scene || !valid) return
    const loop = createEffectLoop({
      scene,
      params,
      render: (draw) => {
        try {
          const recorder = Skia.PictureRecorder()
          draw(createSkiaCtx(recorder.beginRecording(Skia.XYWHRect(0, 0, width, height))))
          picture.value = recorder.finishRecordingAsPicture()
        } catch {
          // Falha ao gravar um quadro: o anterior fica na tela e o efeito tenta de novo no próximo.
        }
      },
      width,
      height,
      rand: Math.random,
      raf: env.raf,
      caf: env.caf
    })
    if (mode === 'run') loop.start()
    else if (mode === 'still') loop.renderStill()
    return () => loop.stop()
    // params entra pelos campos: o objeto muda de identidade a cada render do cartão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, valid, mode, params.density, params.speed, params.color, width, height, picture, env])

  return valid ? picture : null
}
