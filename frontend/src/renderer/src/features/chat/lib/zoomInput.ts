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

export interface ZoomWheel {
  deltaY: number
  /** 0 = pixels; 1 = linhas (roda do Firefox). */
  deltaMode: number
  ctrlKey: boolean
}

const LINE_HEIGHT = 16

/** Escala depois de um giro da roda; a pinça do trackpad chega como roda com Ctrl e passos pequenos. */
export function wheelScale(scale: number, e: ZoomWheel): number {
  const speed = e.ctrlKey ? 0.01 : 0.002
  const delta = e.deltaMode === 1 ? e.deltaY * LINE_HEIGHT : e.deltaY
  return clampScale(scale * Math.exp(-delta * speed))
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
  altKey: boolean
  target: unknown
}

const TEXT_FIELDS = ['INPUT', 'TEXTAREA', 'SELECT']

/** Tecla é do zoom: sem modificador (Ctrl/Cmd é o zoom do app, Alt são atalhos) e fora de campo de texto. */
function isZoomKey(e: ZoomKey): boolean {
  const target = e.target as { tagName?: string; isContentEditable?: boolean } | null
  const typing = TEXT_FIELDS.includes(target?.tagName ?? '') || target?.isContentEditable === true
  return !(e.ctrlKey || e.metaKey || e.altKey || typing)
}

/** Teclado: + e − ampliam no centro, 0 volta, setas movem. Tecla que não é do zoom: `null`. */
export function viewForKey(v: ZoomView, e: ZoomKey, b: ZoomBounds): ZoomView | null {
  if (!isZoomKey(e)) return null
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

// Até isto o ponteiro só tremeu: ainda é um clique (fora da imagem, fecha).
const DRAG_SLOP = 4

/** Ponteiros no palco: onde estão, de onde o gesto partiu e se ele já arrastou. */
export interface DragState {
  pointers: ReadonlyMap<number, Point>
  start: GestureStart
  /** Onde o primeiro ponteiro do gesto desceu. */
  origin: Point
  moved: boolean
}

export const IDLE_DRAG: DragState = {
  pointers: new Map(),
  start: { view: IDENTITY, points: [] },
  origin: CENTER,
  moved: false
}

/** Ponteiro desceu: gesto novo zera o "arrastou"; dedo a mais vira pinça a partir da vista atual. */
export function pointerDown(s: DragState, id: number, p: Point, view: ZoomView): DragState {
  const pointers = new Map(s.pointers).set(id, p)
  const fresh = s.pointers.size === 0
  return {
    pointers,
    start: { view, points: [...pointers.values()] },
    origin: fresh ? p : s.origin,
    moved: !fresh
  }
}

/** Ponteiro andou: a vista nova e o estado; `null` se o ponteiro não começou no palco. */
export function pointerMove(
  s: DragState,
  id: number,
  p: Point,
  b: ZoomBounds
): { state: DragState; view: ZoomView } | null {
  if (!s.pointers.has(id)) return null
  const pointers = new Map(s.pointers).set(id, p)
  const moved = s.moved || distance(p, s.origin) > DRAG_SLOP
  return { state: { ...s, pointers, moved }, view: gestureView(s.start, [...pointers.values()], b) }
}

/** Ponteiro subiu: quem sobrou recomeça o gesto de onde a imagem está, sem pular. */
export function pointerUp(s: DragState, id: number, view: ZoomView): DragState {
  const pointers = new Map(s.pointers)
  pointers.delete(id)
  return { ...s, pointers, start: { view, points: [...pointers.values()] } }
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

export function zoomTransform(v: ZoomView): string {
  return `translate(${v.x}px, ${v.y}px) scale(${v.scale})`
}

/** Cursor de ampliar em 1x, de arrastar ampliada; anima só fora do gesto, que segue o dedo sem atraso. */
export function zoomImageClass(zoomed: boolean, dragging: boolean): string {
  if (dragging) return 'cursor-grabbing'
  const cursor = zoomed ? 'cursor-grab' : 'cursor-zoom-in'
  return `${cursor} motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out`
}

export type ZoomLimit = 'min' | 'mid' | 'max'

/** Em que ponta a escala está: desativa o − em 1x e o + em 5x. */
export function zoomLimit(scale: number): ZoomLimit {
  if (scale <= MIN_ZOOM) return 'min'
  return scale >= MAX_ZOOM ? 'max' : 'mid'
}
