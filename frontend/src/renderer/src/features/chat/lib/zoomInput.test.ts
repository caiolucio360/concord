import { describe, expect, it } from 'vitest'
import { IDENTITY, MAX_ZOOM, type ZoomBounds } from './imageZoom'
import {
  elementBounds,
  fromCenter,
  gestureView,
  sameView,
  viewForKey,
  wheelScale,
  ZOOM_STEP,
  zoomImageClass,
  zoomLevelLabel,
  zoomLimit,
  zoomTransform
} from './zoomInput'

const b: ZoomBounds = { width: 800, height: 600, viewWidth: 800, viewHeight: 600 }
const key = (k: string, mods: { ctrlKey?: boolean; metaKey?: boolean } = {}) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  ...mods
})

describe('wheelScale', () => {
  it('roda para cima amplia e para baixo reduz', () => {
    expect(wheelScale(1, -100, false)).toBeGreaterThan(1)
    expect(wheelScale(2, 100, false)).toBeLessThan(2)
  })

  it('não sai de 1x a 5x', () => {
    expect(wheelScale(1, 5000, false)).toBe(1)
    expect(wheelScale(4, -5000, false)).toBe(MAX_ZOOM)
  })

  it('pinça do trackpad (Ctrl) é mais sensível que a roda', () => {
    expect(wheelScale(1, -10, true)).toBeGreaterThan(wheelScale(1, -10, false))
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

describe('sameView', () => {
  it('compara escala e deslocamento', () => {
    expect(sameView(IDENTITY, { scale: 1, x: 0, y: 0 })).toBe(true)
    expect(sameView(IDENTITY, { scale: 1, x: 1, y: 0 })).toBe(false)
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

describe('zoomLevelLabel / zoomLimit / ZOOM_STEP', () => {
  it('mostra o nível em porcentagem inteira', () => {
    expect(zoomLevelLabel(1)).toBe('100%')
    expect(zoomLevelLabel(1.5625)).toBe('156%')
  })

  it('diz se a imagem está no mínimo, no máximo ou no meio (para desativar - e +)', () => {
    expect(zoomLimit(1)).toBe('min')
    expect(zoomLimit(2.5)).toBe('mid')
    expect(zoomLimit(MAX_ZOOM)).toBe('max')
  })

  it('o passo dos botões é o mesmo das teclas', () => {
    expect(viewForKey(IDENTITY, key('+'), b)?.scale).toBe(ZOOM_STEP)
  })
})
