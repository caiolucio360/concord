/**
 * Zoom da imagem em tela cheia: escala + deslocamento (px) a partir do centro
 * da tela. Pontos também são medidos a partir do centro da área visível.
 * O mobile tem uma cópia desta conta (mobile/src/features/chat/lib/imageZoom.ts).
 */
export interface ZoomView {
  scale: number
  x: number
  y: number
}

export interface Point {
  x: number
  y: number
}

/** Tamanho da imagem em 1x e da área visível. */
export interface ZoomBounds {
  width: number
  height: number
  viewWidth: number
  viewHeight: number
}

export const MIN_ZOOM = 1
export const MAX_ZOOM = 5
const DOUBLE_CLICK_ZOOM = 2
const KEY_ZOOM_STEP = 1.25
const KEY_PAN_STEP = 60
const CENTER: Point = { x: 0, y: 0 }

export const IDENTITY: ZoomView = { scale: 1, x: 0, y: 0 }

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))

/** Desloca dentro de ±(tamanho ampliado − vista)/2; se a imagem cabe inteira, fica no centro. */
function clampOffset(offset: number, size: number, view: number, scale: number): number {
  const max = (size * scale - view) / 2
  return max > 0 ? clamp(offset, -max, max) : 0
}

/** Escala entre 1x e 5x e a imagem sem mostrar fundo além da borda. */
export function clampView(v: ZoomView, b: ZoomBounds): ZoomView {
  const scale = clamp(v.scale, MIN_ZOOM, MAX_ZOOM)
  return {
    scale,
    x: clampOffset(v.x, b.width, b.viewWidth, scale),
    y: clampOffset(v.y, b.height, b.viewHeight, scale)
  }
}

/** Muda a escala mantendo parado o ponto da imagem que está sob `at`. */
export function zoomAt(v: ZoomView, scale: number, at: Point, b: ZoomBounds): ZoomView {
  const next = clamp(scale, MIN_ZOOM, MAX_ZOOM)
  const k = next / v.scale
  return clampView({ scale: next, x: at.x - (at.x - v.x) * k, y: at.y - (at.y - v.y) * k }, b)
}

export function panBy(v: ZoomView, dx: number, dy: number, b: ZoomBounds): ZoomView {
  return clampView({ scale: v.scale, x: v.x + dx, y: v.y + dy }, b)
}

/** Duplo clique/toque: amplia 2x no ponto ou, já ampliada, volta para a imagem inteira. */
export function toggleZoom(v: ZoomView, at: Point, b: ZoomBounds): ZoomView {
  return v.scale > MIN_ZOOM ? IDENTITY : zoomAt(v, DOUBLE_CLICK_ZOOM, at, b)
}

/** Pinça: escala pela razão dos dedos desde `start` e acompanha o ponto médio. */
export function pinchView(start: ZoomView, ratio: number, from: Point, to: Point, b: ZoomBounds): ZoomView {
  const zoomed = zoomAt(start, start.scale * ratio, from, b)
  return panBy(zoomed, to.x - from.x, to.y - from.y, b)
}

/** Escala depois de um giro da roda; a pinça do trackpad chega como roda com Ctrl e passos pequenos. */
export function wheelScale(scale: number, deltaY: number, ctrlKey: boolean): number {
  const speed = ctrlKey ? 0.01 : 0.002
  return clamp(scale * Math.exp(-deltaY * speed), MIN_ZOOM, MAX_ZOOM)
}

const KEY_SCALE: Record<string, number> = { '+': KEY_ZOOM_STEP, '=': KEY_ZOOM_STEP, '-': 1 / KEY_ZOOM_STEP }

// Seta para a esquerda mostra o lado esquerdo: a imagem anda para a direita.
const KEY_PAN: Record<string, Point> = {
  ArrowLeft: { x: KEY_PAN_STEP, y: 0 },
  ArrowRight: { x: -KEY_PAN_STEP, y: 0 },
  ArrowUp: { x: 0, y: KEY_PAN_STEP },
  ArrowDown: { x: 0, y: -KEY_PAN_STEP }
}

/** Teclado: + e − ampliam no centro, 0 volta, setas movem. Outra tecla: `null`. */
export function viewForKey(v: ZoomView, key: string, b: ZoomBounds): ZoomView | null {
  if (key === '0') return IDENTITY
  const factor = KEY_SCALE[key]
  if (factor) return zoomAt(v, v.scale * factor, CENTER, b)
  const move = KEY_PAN[key]
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
    return pinchView(start.view, distance(a1, b1) / Math.max(distance(a0, b0), 1), midpoint(a0, b0), midpoint(a1, b1), b)
  }
  return a0 && a1 ? panBy(start.view, a1.x - a0.x, a1.y - a0.y, b) : start.view
}
