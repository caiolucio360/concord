import { describe, expect, it } from 'vitest'
import { IDENTITY, MAX_ZOOM, type ZoomBounds } from './imageZoom'
import {
  IDLE_DRAG,
  elementBounds,
  fromCenter,
  gestureView,
  pointerDown,
  pointerMove,
  pointerUp,
  viewForKey,
  wheelScale,
  ZOOM_STEP,
  zoomImageClass,
  zoomLimit,
  zoomTransform
} from './zoomInput'

const b: ZoomBounds = { width: 800, height: 600, viewWidth: 800, viewHeight: 600 }
const key = (
  k: string,
  mods: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; target?: unknown } = {}
) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  target: null,
  ...mods
})
const wheel = (deltaY: number, mods: { ctrlKey?: boolean; deltaMode?: number } = {}) => ({
  deltaY,
  ctrlKey: false,
  deltaMode: 0,
  ...mods
})

describe('wheelScale', () => {
  it('roda para cima amplia e para baixo reduz', () => {
    expect(wheelScale(1, wheel(-100))).toBeGreaterThan(1)
    expect(wheelScale(2, wheel(100))).toBeLessThan(2)
  })

  it('não sai de 1x a 5x', () => {
    expect(wheelScale(1, wheel(5000))).toBe(1)
    expect(wheelScale(4, wheel(-5000))).toBe(MAX_ZOOM)
  })

  it('pinça do trackpad (Ctrl) é mais sensível que a roda', () => {
    expect(wheelScale(1, wheel(-10, { ctrlKey: true }))).toBeGreaterThan(wheelScale(1, wheel(-10)))
  })

  it('roda que conta em linhas (Firefox) amplia como a que conta em pixels', () => {
    expect(wheelScale(1, wheel(-3, { deltaMode: 1 }))).toBeCloseTo(wheelScale(1, wheel(-48)))
  })
})

describe('viewForKey', () => {
  it('+ e = ampliam no centro, - reduz, 0 volta', () => {
    expect(viewForKey(IDENTITY, key('+'), b)).toEqual({ scale: 1.25, x: 0, y: 0 })
    expect(viewForKey(IDENTITY, key('='), b)?.scale).toBe(1.25)
    expect(viewForKey({ scale: 2, x: 0, y: 0 }, key('-'), b)?.scale).toBe(1.6)
    expect(viewForKey({ scale: 3, x: 100, y: 0 }, key('0'), b)).toEqual(IDENTITY)
  })

  it('setas movem a imagem ampliada para ver o lado da seta', () => {
    const v = { scale: 2, x: 0, y: 0 }
    expect(viewForKey(v, key('ArrowLeft'), b)).toEqual({ scale: 2, x: 60, y: 0 })
    expect(viewForKey(v, key('ArrowRight'), b)).toEqual({ scale: 2, x: -60, y: 0 })
    expect(viewForKey(v, key('ArrowUp'), b)).toEqual({ scale: 2, x: 0, y: 60 })
    expect(viewForKey(v, key('ArrowDown'), b)).toEqual({ scale: 2, x: 0, y: -60 })
  })

  it('outras teclas não são do zoom', () => {
    expect(viewForKey(IDENTITY, key('a'), b)).toBeNull()
  })

  it('Ctrl/Cmd + tecla fica com o zoom do app, não da imagem', () => {
    expect(viewForKey(IDENTITY, key('+', { ctrlKey: true }), b)).toBeNull()
    expect(viewForKey(IDENTITY, key('0', { metaKey: true }), b)).toBeNull()
    expect(viewForKey(IDENTITY, key('ArrowLeft', { altKey: true }), b)).toBeNull()
  })

  it('digitando num campo, as teclas são do campo', () => {
    expect(viewForKey(IDENTITY, key('+', { target: { tagName: 'INPUT' } }), b)).toBeNull()
    expect(
      viewForKey(IDENTITY, key('+', { target: { tagName: 'DIV', isContentEditable: true } }), b)
    ).toBeNull()
    expect(viewForKey(IDENTITY, key('+', { target: { tagName: 'BUTTON' } }), b)?.scale).toBe(1.25)
  })
})

describe('gestureView', () => {
  const start = { view: { scale: 2, x: 0, y: 0 }, points: [{ x: 0, y: 0 }] }

  it('um dedo/mouse arrasta', () => {
    expect(gestureView(start, [{ x: 25, y: -15 }], b)).toEqual({ scale: 2, x: 25, y: -15 })
  })

  it('dois dedos fazem pinça', () => {
    const pinch = {
      view: IDENTITY,
      points: [
        { x: -50, y: 0 },
        { x: 50, y: 0 }
      ]
    }
    const now = [
      { x: -100, y: 0 },
      { x: 100, y: 0 }
    ]
    expect(gestureView(pinch, now, b)).toEqual({ scale: 2, x: 0, y: 0 })
  })

  it('dois dedos no mesmo ponto não quebram a conta', () => {
    const same = {
      view: IDENTITY,
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 0 }
      ]
    }
    expect(
      gestureView(
        same,
        [
          { x: 0, y: 0 },
          { x: 0, y: 0 }
        ],
        b
      )
    ).toEqual(IDENTITY)
  })

  it('sem ponteiro, fica como começou', () => {
    expect(gestureView(start, [], b)).toEqual(start.view)
  })
})

describe('fromCenter / elementBounds', () => {
  const win = { innerWidth: 1000, innerHeight: 800 }

  it('mede o ponto a partir do centro da janela', () => {
    expect(fromCenter({ clientX: 600, clientY: 300 }, win)).toEqual({ x: 100, y: -100 })
  })

  it('usa o tamanho de layout da imagem (sem o transform) e o da janela', () => {
    expect(elementBounds({ offsetWidth: 640, offsetHeight: 480 }, win)).toEqual({
      width: 640,
      height: 480,
      viewWidth: 1000,
      viewHeight: 800
    })
  })

  it('sem imagem montada, a imagem ocupa a janela', () => {
    expect(elementBounds(null, win)).toEqual({
      width: 1000,
      height: 800,
      viewWidth: 1000,
      viewHeight: 800
    })
  })
})

describe('zoomTransform / zoomImageClass', () => {
  it('desloca e depois amplia a partir do centro', () => {
    expect(zoomTransform({ scale: 2, x: 10, y: -5 })).toBe('translate(10px, -5px) scale(2)')
  })

  it('em 1x o cursor convida a ampliar; ampliada, a arrastar', () => {
    expect(zoomImageClass(false, false)).toContain('cursor-zoom-in')
    expect(zoomImageClass(true, false)).toContain('cursor-grab')
    expect(zoomImageClass(true, true)).toContain('cursor-grabbing')
  })

  it('anima só fora do arraste/pinça (que segue o dedo sem atraso)', () => {
    expect(zoomImageClass(false, false)).toContain('transition-transform')
    expect(zoomImageClass(false, true)).not.toContain('transition-transform')
  })
})

describe('zoomLimit / ZOOM_STEP', () => {
  it('diz se a imagem está no mínimo, no máximo ou no meio (para desativar - e +)', () => {
    expect(zoomLimit(1)).toBe('min')
    expect(zoomLimit(2.5)).toBe('mid')
    expect(zoomLimit(MAX_ZOOM)).toBe('max')
  })

  it('o passo dos botões é o mesmo das teclas', () => {
    expect(viewForKey(IDENTITY, key('+'), b)?.scale).toBe(ZOOM_STEP)
  })
})

describe('pointerDown / pointerMove / pointerUp', () => {
  const zoomed = { scale: 2, x: 0, y: 0 }

  it('arrastar com a imagem ampliada move e marca que arrastou', () => {
    const down = pointerDown(IDLE_DRAG, 1, { x: 0, y: 0 }, zoomed)
    const move = pointerMove(down, 1, { x: 30, y: 10 }, b)
    expect(move?.view).toEqual({ scale: 2, x: 30, y: 10 })
    expect(move?.state.moved).toBe(true)
  })

  it('tremida de poucos pixels ainda é clique (fecha ao clicar fora)', () => {
    const down = pointerDown(IDLE_DRAG, 1, { x: 0, y: 0 }, zoomed)
    expect(pointerMove(down, 1, { x: 2, y: 1 }, b)?.state.moved).toBe(false)
  })

  it('um gesto novo esquece o arraste do anterior (no toque não vem clique depois do arraste)', () => {
    const dragged = pointerMove(
      pointerDown(IDLE_DRAG, 1, { x: 0, y: 0 }, zoomed),
      1,
      { x: 50, y: 0 },
      b
    )!
    const released = pointerUp(dragged.state, 1, dragged.view)
    expect(released.moved).toBe(true)
    expect(pointerDown(released, 2, { x: 0, y: 0 }, dragged.view).moved).toBe(false)
  })

  it('segundo dedo vira pinça, partindo de onde a imagem está', () => {
    const one = pointerDown(IDLE_DRAG, 1, { x: -50, y: 0 }, IDENTITY)
    const two = pointerDown(one, 2, { x: 50, y: 0 }, IDENTITY)
    expect(two.moved).toBe(true)
    expect(pointerMove(two, 2, { x: 150, y: 0 }, b)?.view.scale).toBe(2)
  })

  it('soltar um dos dedos da pinça continua arrastando sem pular', () => {
    const two = pointerDown(
      pointerDown(IDLE_DRAG, 1, { x: -50, y: 0 }, IDENTITY),
      2,
      { x: 50, y: 0 },
      IDENTITY
    )
    const pinched = pointerMove(two, 2, { x: 150, y: 0 }, b)!
    const left = pointerUp(pinched.state, 2, pinched.view)
    expect(pointerMove(left, 1, { x: -50, y: 0 }, b)?.view).toEqual(pinched.view)
  })

  it('ponteiro que não começou no palco é ignorado', () => {
    expect(pointerMove(IDLE_DRAG, 9, { x: 10, y: 10 }, b)).toBeNull()
  })
})
