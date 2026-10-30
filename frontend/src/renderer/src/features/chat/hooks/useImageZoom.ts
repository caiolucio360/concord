import { useEffect, useEffectEvent, useRef, useState, type RefObject } from 'react'
import { IDENTITY, toggleZoom, zoomAt, type Point, type ZoomView } from '../lib/imageZoom'
import {
  CENTER,
  IDLE_DRAG,
  elementBounds,
  fromCenter,
  pointerDown,
  pointerMove,
  pointerUp,
  viewForKey,
  wheelScale,
  zoomLevelLabel,
  zoomLimit,
  zoomTransform,
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
  /** true se o último gesto arrastou ou pinçou (o clique que vem depois dele não fecha). */
  wasDrag: () => boolean
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
 * muda quando o cursor ou um botão muda (começo/fim do gesto, 1x, 5x). Só ações
 * discretas (botões, teclas, duplo clique) animam; roda e dedos seguem sem atraso.
 */
export function useImageZoom(targets: ZoomTargets): ImageZoom {
  const { stage, image, level } = targets
  const [limit, setLimit] = useState<ZoomLimit>('min')
  const [dragging, setDragging] = useState(false)
  const view = useRef<ZoomView>(IDENTITY)
  const frame = useRef(0)
  const smooth = useRef(false)
  const drag = useRef(IDLE_DRAG)

  const bounds = (): ReturnType<typeof elementBounds> => elementBounds(image.current, window)

  const paint = (): void => {
    frame.current = 0
    const style = image.current?.style
    // Sem a duração inline vale a da classe (e o motion-safe dela).
    style?.setProperty('transition-duration', smooth.current ? '' : '0s')
    style?.setProperty('transform', zoomTransform(view.current))
    level.current?.replaceChildren(zoomLevelLabel(view.current.scale))
  }

  const apply = (next: ZoomView, animate = false): void => {
    view.current = next
    smooth.current = animate
    setLimit(zoomLimit(next.scale))
    if (!frame.current) frame.current = requestAnimationFrame(paint)
  }

  // Não passivo: o preventDefault segura o zoom/rolagem da página na pinça do trackpad.
  const onWheel = useEffectEvent((e: WheelEvent) => {
    e.preventDefault()
    const scale = wheelScale(view.current.scale, e)
    apply(zoomAt(view.current, scale, point(e), bounds()))
  })

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const next = viewForKey(view.current, e, bounds())
    if (!next) return
    e.preventDefault()
    apply(next, true)
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
    drag.current = pointerDown(drag.current, e.pointerId, point(e), view.current)
    setDragging(true)
  }

  const onPointerMove = (e: React.PointerEvent): void => {
    const next = pointerMove(drag.current, e.pointerId, point(e), bounds())
    if (!next) return
    drag.current = next.state
    apply(next.view)
  }

  const onPointerUp = (e: React.PointerEvent): void => {
    drag.current = pointerUp(drag.current, e.pointerId, view.current)
    setDragging(drag.current.pointers.size > 0)
  }

  return {
    limit,
    dragging,
    zoomBy: (factor) =>
      apply(zoomAt(view.current, view.current.scale * factor, CENTER, bounds()), true),
    reset: () => apply(IDENTITY, true),
    toggleAt: (e) => apply(toggleZoom(view.current, point(e), bounds()), true),
    wasDrag: () => drag.current.moved,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }
  }
}
