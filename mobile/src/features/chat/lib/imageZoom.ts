/**
 * Zoom da imagem em tela cheia: escala + deslocamento (dp) a partir do centro
 * da tela. Pontos também são medidos a partir do centro. Cópia adaptada de
 * frontend/src/renderer/src/features/chat/lib/imageZoom.ts (ADR 0021): aqui cada
 * função é 'worklet' porque os gestos rodam no thread de UI.
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
/** Passo dos botões − e +. */
export const ZOOM_STEP = 1.25
const DOUBLE_TAP_ZOOM = 2

export const IDENTITY: ZoomView = { scale: 1, x: 0, y: 0 }

function clamp(v: number, min: number, max: number): number {
  'worklet'
  return Math.min(max, Math.max(min, v))
}

export function clampScale(scale: number): number {
  'worklet'
  return clamp(scale, MIN_ZOOM, MAX_ZOOM)
}

/** Desloca dentro de ±(tamanho ampliado − vista)/2; se a imagem cabe inteira, fica no centro. */
function clampOffset(offset: number, size: number, view: number, scale: number): number {
  'worklet'
  const max = (size * scale - view) / 2
  return max > 0 ? clamp(offset, -max, max) : 0
}

/** Escala entre 1x e 5x e a imagem sem mostrar fundo além da borda. */
export function clampView(v: ZoomView, b: ZoomBounds): ZoomView {
  'worklet'
  const scale = clampScale(v.scale)
  return {
    scale,
    x: clampOffset(v.x, b.width, b.viewWidth, scale),
    y: clampOffset(v.y, b.height, b.viewHeight, scale)
  }
}

/** Muda a escala mantendo parado o ponto da imagem que está sob `at`. */
export function zoomAt(v: ZoomView, scale: number, at: Point, b: ZoomBounds): ZoomView {
  'worklet'
  const next = clampScale(scale)
  const k = next / v.scale
  return clampView({ scale: next, x: at.x - (at.x - v.x) * k, y: at.y - (at.y - v.y) * k }, b)
}

export function panBy(v: ZoomView, dx: number, dy: number, b: ZoomBounds): ZoomView {
  'worklet'
  return clampView({ scale: v.scale, x: v.x + dx, y: v.y + dy }, b)
}

/** Duplo toque: amplia 2x no ponto ou, já ampliada, volta para a imagem inteira. */
export function toggleZoom(v: ZoomView, at: Point, b: ZoomBounds): ZoomView {
  'worklet'
  return v.scale > MIN_ZOOM ? IDENTITY : zoomAt(v, DOUBLE_TAP_ZOOM, at, b)
}

/** Pinça: escala pela razão dos dedos desde `start` e acompanha o ponto focal. */
export function pinchView(start: ZoomView, ratio: number, from: Point, to: Point, b: ZoomBounds): ZoomView {
  'worklet'
  const zoomed = zoomAt(start, start.scale * ratio, from, b)
  return panBy(zoomed, to.x - from.x, to.y - from.y, b)
}

/** Tamanho da imagem com resizeMode "contain"; sem as dimensões do anexo, a tela inteira. */
export function containSize(width: number | null | undefined, height: number | null | undefined, viewWidth: number, viewHeight: number) {
  if (!width || !height) return { width: viewWidth, height: viewHeight }
  const k = Math.min(viewWidth / width, viewHeight / height)
  return { width: width * k, height: height * k }
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
