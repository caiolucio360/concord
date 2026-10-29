import { useEffect, useEffectEvent, useRef, useState, type RefObject } from 'react'
import { IDENTITY, toggleZoom, zoomAt, type Point, type ZoomView } from '../lib/imageZoom'
import {
  CENTER,
  elementBounds,
  fromCenter,
  gestureView,
  sameView,
  viewForKey,
  wheelScale,
  zoomLevelLabel,
  zoomLimit,
  zoomTransform,
  type GestureStart,
  type ZoomLimit
} from '../lib/zoomInput'

/** Onde o hook escuta e escreve: o palco, o transform da imagem e o texto do nível ("150%"). */
export interface ZoomTargets {
  stage: RefObject<HTMLElement | null>
  image: RefObject<HTMLImageElement | null>
  level: RefObject<HTMLElement | null>
}

export interface ImageZoom {
  /** Em que ponta a escala está (desativa os botões − e +); muda só nas pontas. */
  limit: ZoomLimit
  dragging: boolean
  zoomBy: (factor: number) => void
  reset: () => void
  /** Duplo clique: amplia 2x no ponto ou volta para a imagem inteira. */
  toggleAt: (e: React.MouseEvent) => void
  /** true se o último gesto moveu a imagem (o clique que vem depois dele não fecha). */
  consumeDrag: () => boolean
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
  }
}

const point = (e: { clientX: number; clientY: number }): Point => fromCenter(e, window)

/**
 * Zoom da imagem do lightbox: roda/pinça do trackpad, arraste e pinça com ponteiros,
 * duplo clique, teclado e botões. A vista mora num ref, e o transform e o nível vão
 * direto no DOM, uma vez por frame: arrastar não re-renderiza o React. O state só
 * muda quando o cursor ou um botão muda (começo/fim do gesto, 1x, 5x).
 */
export function useImageZoom(targets: ZoomTargets): ImageZoom {
  const { stage, image, level } = targets
  const [limit, setLimit] = useState<ZoomLimit>('min')
  const [dragging, setDragging] = useState(false)
  const view = useRef<ZoomView>(IDENTITY)
  const frame = useRef(0)
  const pointers = useRef(new Map<number, Point>())
  const start = useRef<GestureStart>({ view: IDENTITY, points: [] })
  const moved = useRef(false)

  const bounds = (): ReturnType<typeof elementBounds> => elementBounds(image.current, window)

  const paint = (): void => {
    frame.current = 0
    image.current?.style.setProperty('transform', zoomTransform(view.current))
    level.current?.replaceChildren(zoomLevelLabel(view.current.scale))
  }

  const apply = (next: ZoomView): void => {
    view.current = next
    setLimit(zoomLimit(next.scale))
    if (!frame.current) frame.current = requestAnimationFrame(paint)
  }

  const restart = (): void => {
    start.current = { view: view.current, points: [...pointers.current.values()] }
  }

  // Não passivo: o preventDefault segura o zoom/rolagem da página na pinça do trackpad.
  const onWheel = useEffectEvent((e: WheelEvent) => {
    e.preventDefault()
    const scale = wheelScale(view.current.scale, e.deltaY, e.ctrlKey)
    apply(zoomAt(view.current, scale, point(e), bounds()))
  })

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const next = viewForKey(view.current, e, bounds())
    if (!next) return
    e.preventDefault()
    apply(next)
  })

  useEffect(() => {
    const el = stage.current
    if (!el) return
    const wheel = (e: WheelEvent): void => onWheel(e)
    const key = (e: KeyboardEvent): void => onKey(e)
    el.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('keydown', key)
    return () => {
      el.removeEventListener('wheel', wheel)
      window.removeEventListener('keydown', key)
      cancelAnimationFrame(frame.current)
    }
  }, [stage])

  const onPointerDown = (e: React.PointerEvent): void => {
    if (e.button !== 0) return
    pointers.current.set(e.pointerId, point(e))
    setDragging(true)
    restart()
  }

  const onPointerMove = (e: React.PointerEvent): void => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, point(e))
    const next = gestureView(start.current, [...pointers.current.values()], bounds())
    if (!sameView(next, start.current.view)) moved.current = true
    apply(next)
  }

  // Dedo a mais ou a menos: o gesto recomeça de onde a imagem está, sem pular.
  const onPointerUp = (e: React.PointerEvent): void => {
    pointers.current.delete(e.pointerId)
    setDragging(pointers.current.size > 0)
    restart()
  }

  const consumeDrag = (): boolean => {
    const was = moved.current
    moved.current = false
    return was
  }

  return {
    limit,
    dragging,
    zoomBy: (factor) => apply(zoomAt(view.current, view.current.scale * factor, CENTER, bounds())),
    reset: () => apply(IDENTITY),
    toggleAt: (e) => apply(toggleZoom(view.current, point(e), bounds())),
    consumeDrag,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }
  }
}
