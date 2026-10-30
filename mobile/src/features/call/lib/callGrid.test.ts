import { callGrid } from './callGrid'

describe('callGrid (grade da chamada como no Discord: tiles grandes que preenchem a tela)', () => {
  it('uma pessoa: um tile grande, com teto de altura e foto grande', () => {
    const g = callGrid(360, 700, 1)
    expect(g).toMatchObject({ columns: 1, tileHeight: 360, scroll: false })
    expect(g.avatar).toBeGreaterThanOrEqual(96)
    expect(g.avatar).toBeLessThanOrEqual(120)
  })

  it('duas pessoas: uma em cima da outra, dividindo a altura', () => {
    expect(callGrid(360, 612, 2)).toMatchObject({ columns: 1, tileHeight: 288, scroll: false })
  })

  it('3 e 4 pessoas: duas colunas', () => {
    expect(callGrid(360, 700, 3).columns).toBe(2)
    expect(callGrid(360, 700, 4)).toMatchObject({ columns: 2, tileHeight: 332, scroll: false })
  })

  it('muita gente: tiles no tamanho mínimo e a lista rola', () => {
    expect(callGrid(360, 700, 12)).toMatchObject({ columns: 2, tileHeight: 132, scroll: true })
  })

  it('tela larga usa mais colunas', () => {
    expect(callGrid(900, 600, 5).columns).toBe(3)
  })

  it('a foto nunca passa dos limites nem do tile', () => {
    const small = callGrid(360, 700, 12)
    expect(small.avatar).toBeGreaterThanOrEqual(56)
    expect(small.avatar).toBeLessThanOrEqual(small.tileHeight)
    expect(callGrid(1280, 900, 1).avatar).toBe(120)
  })

  it('sem ninguém não quebra', () => {
    expect(callGrid(360, 700, 0).columns).toBe(1)
  })
})
