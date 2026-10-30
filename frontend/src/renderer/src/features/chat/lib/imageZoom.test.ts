import { describe, expect, it } from 'vitest'
import {
  IDENTITY,
  MAX_ZOOM,
  clampView,
  panBy,
  pinchView,
  toggleZoom,
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
    expect(pinchView({ scale: 2, x: 0, y: 0 }, 1.5, { x: 0, y: 0 }, { x: 0, y: 0 }, b).scale).toBe(
      3
    )
  })
})
