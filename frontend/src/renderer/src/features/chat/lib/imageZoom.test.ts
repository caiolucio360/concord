import { describe, expect, it } from 'vitest'
import {
  IDENTITY,
  MAX_ZOOM,
  clampView,
  gestureView,
  panBy,
  pinchView,
  toggleZoom,
  viewForKey,
  wheelScale,
  zoomAt,
  type ZoomBounds
} from './imageZoom'

// Imagem 800×600 em 1x numa tela do mesmo tamanho: em 1x não sobra nada para mover.
const b: ZoomBounds = { width: 800, height: 600, viewWidth: 800, viewHeight: 600 }

describe('clampView', () => {
  it('prende a escala entre 1x e 5x', () => {
    expect(clampView({ scale: 0.3, x: 0, y: 0 }, b).scale).toBe(1)
    expect(clampView({ scale: 9, x: 0, y: 0 }, b).scale).toBe(MAX_ZOOM)
  })

  it('em 1x a imagem volta para o centro', () => {
    expect(clampView({ scale: 1, x: 120, y: -40 }, b)).toEqual(IDENTITY)
  })

  it('ampliada, não deixa mostrar fundo além da borda', () => {
    // 2x: 1600×1200 numa tela 800×600 → até 400 px para cada lado e 300 para cima/baixo.
    expect(clampView({ scale: 2, x: 999, y: -999 }, b)).toEqual({ scale: 2, x: 400, y: -300 })
    expect(clampView({ scale: 2, x: 100, y: 50 }, b)).toEqual({ scale: 2, x: 100, y: 50 })
  })

  it('eixo em que a imagem cabe inteira fica centrado', () => {
    const tall = { width: 300, height: 600, viewWidth: 800, viewHeight: 600 }
    expect(clampView({ scale: 2, x: 200, y: 100 }, tall)).toEqual({ scale: 2, x: 0, y: 100 })
  })
})

describe('zoomAt', () => {
  it('mantém parado o ponto da imagem que está sob o cursor', () => {
    expect(zoomAt(IDENTITY, 2, { x: 100, y: 0 }, b)).toEqual({ scale: 2, x: -100, y: 0 })
  })

  it('no centro só muda a escala', () => {
    expect(zoomAt(IDENTITY, 3, { x: 0, y: 0 }, b)).toEqual({ scale: 3, x: 0, y: 0 })
  })

  it('não passa de 5x', () => {
    expect(zoomAt({ scale: 4, x: 0, y: 0 }, 50, { x: 0, y: 0 }, b).scale).toBe(MAX_ZOOM)
  })
})

describe('panBy', () => {
  it('move a imagem ampliada', () => {
    expect(panBy({ scale: 2, x: 0, y: 0 }, 30, -20, b)).toEqual({ scale: 2, x: 30, y: -20 })
  })

  it('em 1x não move', () => {
    expect(panBy(IDENTITY, 30, -20, b)).toEqual(IDENTITY)
  })
})

describe('toggleZoom', () => {
  it('em 1x amplia 2x no ponto clicado', () => {
    expect(toggleZoom(IDENTITY, { x: -100, y: 50 }, b)).toEqual({ scale: 2, x: 100, y: -50 })
  })

  it('ampliada, volta para a imagem inteira', () => {
    expect(toggleZoom({ scale: 3, x: 50, y: 0 }, { x: 0, y: 0 }, b)).toEqual(IDENTITY)
  })
})

describe('pinchView', () => {
  it('amplia pela razão dos dedos e acompanha o ponto médio', () => {
    expect(pinchView(IDENTITY, 2, { x: 0, y: 0 }, { x: 40, y: 10 }, b)).toEqual({
      scale: 2,
      x: 40,
      y: 10
    })
  })

  it('a escala parte da do começo do gesto', () => {
    expect(pinchView({ scale: 2, x: 0, y: 0 }, 1.5, { x: 0, y: 0 }, { x: 0, y: 0 }, b).scale).toBe(3)
  })
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
    expect(viewForKey(IDENTITY, '+', b)).toEqual({ scale: 1.25, x: 0, y: 0 })
    expect(viewForKey(IDENTITY, '=', b)?.scale).toBe(1.25)
    expect(viewForKey({ scale: 2, x: 0, y: 0 }, '-', b)?.scale).toBe(1.6)
    expect(viewForKey({ scale: 3, x: 100, y: 0 }, '0', b)).toEqual(IDENTITY)
  })

  it('setas movem a imagem ampliada para ver o lado da seta', () => {
    const v = { scale: 2, x: 0, y: 0 }
    expect(viewForKey(v, 'ArrowLeft', b)).toEqual({ scale: 2, x: 60, y: 0 })
    expect(viewForKey(v, 'ArrowRight', b)).toEqual({ scale: 2, x: -60, y: 0 })
    expect(viewForKey(v, 'ArrowUp', b)).toEqual({ scale: 2, x: 0, y: 60 })
    expect(viewForKey(v, 'ArrowDown', b)).toEqual({ scale: 2, x: 0, y: -60 })
  })

  it('outras teclas não são do zoom', () => {
    expect(viewForKey(IDENTITY, 'a', b)).toBeNull()
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

  it('sem ponteiro, fica como começou', () => {
    expect(gestureView(start, [], b)).toEqual(start.view)
  })
})
