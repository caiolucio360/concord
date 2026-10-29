import {
  IDENTITY,
  MAX_ZOOM,
  MIN_ZOOM,
  clampScale,
  panBy,
  pinchView,
  zoomAt,
  type Point,
  type ZoomBounds,
  type ZoomView
} from './imageZoom'

/** Entrada do zoom no desktop/web: roda, teclado, botões e ponteiros (mouse, toque, caneta). */

/** Passo das teclas + − e dos botões de zoom. */
export const ZOOM_STEP = 1.25
const KEY_PAN_STEP = 60
export const CENTER: Point = { x: 0, y: 0 }

/** Escala depois de um giro da roda; a pinça do trackpad chega como roda com Ctrl e passos pequenos. */
export function wheelScale(scale: number, deltaY: number, ctrlKey: boolean): number {
  const speed = ctrlKey ? 0.01 : 0.002
  return clampScale(scale * Math.exp(-deltaY * speed))
}

const KEY_SCALE: Record<string, number> = {
  '+': ZOOM_STEP,
  '=': ZOOM_STEP,
  '-': 1 / ZOOM_STEP
}

// Seta para a esquerda mostra o lado esquerdo: a imagem anda para a direita.
const KEY_PAN: Record<string, Point> = {
  ArrowLeft: { x: KEY_PAN_STEP, y: 0 },
  ArrowRight: { x: -KEY_PAN_STEP, y: 0 },
  ArrowUp: { x: 0, y: KEY_PAN_STEP },
  ArrowDown: { x: 0, y: -KEY_PAN_STEP }
}

export interface ZoomKey {
  key: string
  ctrlKey: boolean
  metaKey: boolean
}

/** Teclado: + e − ampliam no centro, 0 volta, setas movem. Com Ctrl/Cmd é o zoom do app: `null`. */
export function viewForKey(v: ZoomView, e: ZoomKey, b: ZoomBounds): ZoomView | null {
  if (e.ctrlKey || e.metaKey) return null
  if (e.key === '0') return IDENTITY
  const factor = KEY_SCALE[e.key]
  if (factor) return zoomAt(v, v.scale * factor, CENTER, b)
  const move = KEY_PAN[e.key]
  return move ? panBy(v, move.x, move.y, b) : null
}

/** Começo de um gesto de ponteiros: a vista e onde cada ponteiro estava. */
export interface GestureStart {
  view: ZoomView
  points: Point[]
}

const distance = (p: Point, q: Point): number => Math.hypot(p.x - q.x, p.y - q.y)
const midpoint = (p: Point, q: Point): Point => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 })

/** Vista atual de um gesto: um ponteiro arrasta, dois fazem pinça. */
export function gestureView(start: GestureStart, now: Point[], b: ZoomBounds): ZoomView {
  const [a0, b0] = start.points
  const [a1, b1] = now
  if (b0 && b1) {
    const ratio = distance(a1, b1) / Math.max(distance(a0, b0), 1)
    return pinchView(start.view, ratio, midpoint(a0, b0), midpoint(a1, b1), b)
  }
  return a0 && a1 ? panBy(start.view, a1.x - a0.x, a1.y - a0.y, b) : start.view
}

interface WindowSize {
  innerWidth: number
  innerHeight: number
}

/** Ponto do evento medido a partir do centro da janela (o lightbox ocupa a janela inteira). */
export function fromCenter(e: { clientX: number; clientY: number }, win: WindowSize): Point {
  return { x: e.clientX - win.innerWidth / 2, y: e.clientY - win.innerHeight / 2 }
}

/** Tamanho da imagem em 1x: o de layout (`offset*` ignora o transform) e o da janela. */
export function elementBounds(
  el: { offsetWidth: number; offsetHeight: number } | null,
  win: WindowSize
): ZoomBounds {
  const size = el ?? { offsetWidth: win.innerWidth, offsetHeight: win.innerHeight }
  return {
    width: size.offsetWidth,
    height: size.offsetHeight,
    viewWidth: win.innerWidth,
    viewHeight: win.innerHeight
  }
}

export function sameView(a: ZoomView, b: ZoomView): boolean {
  return a.scale === b.scale && a.x === b.x && a.y === b.y
}

export function zoomTransform(v: ZoomView): string {
  return `translate(${v.x}px, ${v.y}px) scale(${v.scale})`
}

/** Cursor de ampliar em 1x, de arrastar ampliada; anima só fora do gesto, que segue o dedo sem atraso. */
export function zoomImageClass(zoomed: boolean, dragging: boolean): string {
  if (dragging) return 'cursor-grabbing'
  const cursor = zoomed ? 'cursor-grab' : 'cursor-zoom-in'
  return `${cursor} motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out`
}

export function zoomLevelLabel(scale: number): string {
  return `${Math.round(scale * 100)}%`
}

export type ZoomLimit = 'min' | 'mid' | 'max'

/** Em que ponta a escala está: desativa o − em 1x e o + em 5x. */
export function zoomLimit(scale: number): ZoomLimit {
  if (scale <= MIN_ZOOM) return 'min'
  return scale >= MAX_ZOOM ? 'max' : 'mid'
}
