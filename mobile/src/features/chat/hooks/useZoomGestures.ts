import { useRef, useState } from 'react'
import { useExclusiveGestures, usePanGesture, usePinchGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler'
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { IDENTITY, MIN_ZOOM, panBy, pinchView, toggleZoom, zoomAt, type Point, type ZoomBounds, type ZoomView } from '../lib/imageZoom'

const TIMING = { duration: 180 }
const CENTER: Point = { x: 0, y: 0 }

/**
 * Pinça, arraste com um dedo, duplo toque (1x ↔ 2x) e toque simples (fecha em 1x)
 * na imagem do lightbox. A vista mora em shared values e os gestos rodam no thread
 * de UI: a imagem segue o dedo sem passar pelo JS. `level` (a escala, que desativa
 * − e + nas pontas) só chega ao React no fim de cada gesto ou toque de botão. `bounds` vem do tamanho
 * medido do lightbox (useLayoutSize).
 */
export function useZoomGestures(bounds: ZoomBounds, onClose: () => void) {
  const scale = useSharedValue(1)
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const start = useSharedValue<ZoomView>(IDENTITY)
  const focal = useSharedValue<Point>(CENTER)
  const [level, setLevel] = useState(1)
  // Onde a imagem vai parar: os botões partem dele, não do meio de uma animação.
  const target = useRef<ZoomView>(IDENTITY)
  const remember = (v: ZoomView) => {
    target.current = v
    setLevel(v.scale)
  }

  const current = (): ZoomView => {
    'worklet'
    return { scale: scale.value, x: x.value, y: y.value }
  }
  const set = (v: ZoomView) => {
    'worklet'
    scale.value = v.scale
    x.value = v.x
    y.value = v.y
  }
  const animateTo = (v: ZoomView) => {
    'worklet'
    scale.value = withTiming(v.scale, TIMING)
    x.value = withTiming(v.x, TIMING)
    y.value = withTiming(v.y, TIMING)
  }
  // Os gestos medem a partir do canto da área do lightbox; a conta, a partir do centro.
  const fromCenter = (px: number, py: number): Point => {
    'worklet'
    return { x: px - bounds.viewWidth / 2, y: py - bounds.viewHeight / 2 }
  }
  const settle = () => {
    'worklet'
    scheduleOnRN(remember, current())
  }

  const pinch = usePinchGesture({
    onActivate: (e) => {
      'worklet'
      start.value = current()
      focal.value = fromCenter(e.focalX, e.focalY)
    },
    onUpdate: (e) => {
      'worklet'
      set(pinchView(start.value, e.scale, focal.value, fromCenter(e.focalX, e.focalY), bounds))
    },
    onDeactivate: settle
  })

  const pan = usePanGesture({
    maxPointers: 1,
    onActivate: () => {
      'worklet'
      start.value = current()
    },
    onUpdate: (e) => {
      'worklet'
      set(panBy(start.value, e.translationX, e.translationY, bounds))
    }
  })

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    testID: 'lightbox-duplo-toque',
    onActivate: (e) => {
      'worklet'
      const next = toggleZoom(current(), fromCenter(e.x, e.y), bounds)
      animateTo(next)
      scheduleOnRN(remember, next)
    }
  })

  // No JS: fechar mexe no estado do React. Ampliada, o toque não fecha (só o X).
  const singleTap = useTapGesture({
    runOnJS: true,
    testID: 'lightbox-toque',
    onActivate: () => {
      if (scale.value <= MIN_ZOOM) onClose()
    }
  })

  const taps = useExclusiveGestures(doubleTap, singleTap)
  const gesture = useSimultaneousGestures(pinch, pan, taps)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }]
  }))

  // Botões da barra (thread JS): a mesma conta, animada.
  const show = (v: ZoomView) => {
    animateTo(v)
    remember(v)
  }

  return {
    gesture,
    animatedStyle,
    level,
    zoomBy: (factor: number) => show(zoomAt(target.current, target.current.scale * factor, CENTER, bounds))
  }
}
