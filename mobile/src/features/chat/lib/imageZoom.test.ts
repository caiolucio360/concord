import { IDENTITY, MAX_ZOOM, ZOOM_STEP, clampView, containSize, panBy, pinchView, toggleZoom, zoomAt, zoomLimit, type ZoomBounds } from './imageZoom'

// Imagem 800×600 em 1x numa tela do mesmo tamanho: em 1x não sobra nada para mover.
const b: ZoomBounds = {
  width: 800,
  height: 600,
  viewWidth: 800,
  viewHeight: 600
}

describe('clampView', () => {
  it('prende a escala entre 1x e 5x', () => {
    expect(clampView({ scale: 0.3, x: 0, y: 0 }, b).scale).toBe(1)
    expect(clampView({ scale: 9, x: 0, y: 0 }, b).scale).toBe(MAX_ZOOM)
  })

  it('em 1x a imagem volta para o centro', () => {
    expect(clampView({ scale: 1, x: 120, y: -40 }, b)).toEqual(IDENTITY)
  })

  it('ampliada, não deixa mostrar fundo além da borda', () => {
    expect(clampView({ scale: 2, x: 999, y: -999 }, b)).toEqual({
      scale: 2,
      x: 400,
      y: -300
    })
  })

  it('eixo em que a imagem cabe inteira fica centrado', () => {
    const tall = { width: 300, height: 600, viewWidth: 800, viewHeight: 600 }
    expect(clampView({ scale: 2, x: 200, y: 100 }, tall)).toEqual({
      scale: 2,
      x: 0,
      y: 100
    })
  })
})

describe('zoomAt / panBy / toggleZoom / pinchView', () => {
  it('zoomAt mantém parado o ponto sob o dedo', () => {
    expect(zoomAt(IDENTITY, 2, { x: 100, y: 0 }, b)).toEqual({
      scale: 2,
      x: -100,
      y: 0
    })
  })

  it('panBy move só a imagem ampliada', () => {
    expect(panBy({ scale: 2, x: 0, y: 0 }, 30, -20, b)).toEqual({
      scale: 2,
      x: 30,
      y: -20
    })
    expect(panBy(IDENTITY, 30, -20, b)).toEqual(IDENTITY)
  })

  it('toggleZoom amplia 2x no ponto e depois volta', () => {
    expect(toggleZoom(IDENTITY, { x: -100, y: 50 }, b)).toEqual({
      scale: 2,
      x: 100,
      y: -50
    })
    expect(toggleZoom({ scale: 3, x: 50, y: 0 }, { x: 0, y: 0 }, b)).toEqual(IDENTITY)
  })

  it('pinchView amplia pela razão e acompanha o ponto focal', () => {
    expect(pinchView(IDENTITY, 2, { x: 0, y: 0 }, { x: 40, y: 10 }, b)).toEqual({ scale: 2, x: 40, y: 10 })
    expect(pinchView({ scale: 2, x: 0, y: 0 }, 1.5, { x: 0, y: 0 }, { x: 0, y: 0 }, b).scale).toBe(3)
  })
})

describe('containSize', () => {
  it('encaixa a imagem inteira na tela (resizeMode contain)', () => {
    expect(containSize(800, 600, 400, 800)).toEqual({
      width: 400,
      height: 300
    })
    expect(containSize(600, 1200, 400, 400)).toEqual({
      width: 200,
      height: 400
    })
  })

  it('sem as dimensões do anexo, usa a tela inteira', () => {
    expect(containSize(0, 0, 400, 800)).toEqual({ width: 400, height: 800 })
    expect(containSize(null, undefined, 400, 800)).toEqual({
      width: 400,
      height: 800
    })
  })
})

describe('barra de zoom', () => {
  it('diz a ponta da escala (desativa − em 1x e + em 5x)', () => {
    expect(zoomLimit(1)).toBe('min')
    expect(zoomLimit(2.5)).toBe('mid')
    expect(zoomLimit(MAX_ZOOM)).toBe('max')
  })

  it('passo dos botões', () => {
    expect(ZOOM_STEP).toBe(1.25)
  })
})
