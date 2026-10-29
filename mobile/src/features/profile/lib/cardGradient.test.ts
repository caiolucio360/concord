import { gradientLine, prideStops } from './cardGradient'
import { PRIDE_PALETTE } from './profilePride'

describe('gradientLine (a linha do degradê como no CSS: 180° = de cima para baixo)', () => {
  it('180°: de cima para baixo, pelo meio', () => {
    expect(gradientLine(180, 200, 100)).toEqual({ x0: 100, y0: 0, x1: 100, y1: 100 })
  })

  it('90°: da esquerda para a direita', () => {
    const l = gradientLine(90, 200, 100)
    expect(l.x0).toBeCloseTo(0)
    expect(l.y0).toBeCloseTo(50)
    expect(l.x1).toBeCloseTo(200)
    expect(l.y1).toBeCloseTo(50)
  })

  it('0°: de baixo para cima e 270°: da direita para a esquerda', () => {
    const up = gradientLine(0, 200, 100)
    expect([up.y0, up.y1].map(Math.round)).toEqual([100, 0])
    const left = gradientLine(270, 200, 100)
    expect([left.x0, left.x1].map(Math.round)).toEqual([200, 0])
  })

  it('45°: a linha cobre exatamente os cantos opostos (sem faixa vazia)', () => {
    const l = gradientLine(45, 100, 100)
    expect(l.x0).toBeCloseTo(0)
    expect(l.y0).toBeCloseTo(100)
    expect(l.x1).toBeCloseTo(100)
    expect(l.y1).toBeCloseTo(0)
  })

  it('tamanho zero ou ângulo inválido não gera NaN', () => {
    for (const [a, w, h] of [[180, 0, 0], [Number.NaN, 100, 50], [Infinity, 100, 50]]) {
      const l = gradientLine(a, w, h)
      expect(Object.values(l).every(Number.isFinite)).toBe(true)
    }
  })
})

describe('prideStops (faixas duras, como o fundo do desktop)', () => {
  it('seis faixas iguais: cada cor aparece duas vezes e as posições fecham em 0 e 1', () => {
    const { colors, positions } = prideStops(PRIDE_PALETTE)
    expect(colors).toHaveLength(12)
    expect(positions).toHaveLength(12)
    expect(colors[0]).toBe(PRIDE_PALETTE[0])
    expect(colors[1]).toBe(PRIDE_PALETTE[0])
    expect(colors[11]).toBe(PRIDE_PALETTE[5])
    expect(positions[0]).toBe(0)
    expect(positions[11]).toBe(1)
    expect(positions[1]).toBeCloseTo(1 / 6)
    expect(positions[2]).toBeCloseTo(1 / 6)
  })

  it('lista vazia não quebra', () => {
    expect(prideStops([])).toEqual({ colors: [], positions: [] })
  })
})
