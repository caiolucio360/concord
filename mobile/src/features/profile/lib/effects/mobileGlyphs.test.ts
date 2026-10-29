import { MATRIX_GLYPHS } from './matrix'

// Medido no aparelho: nenhuma família de fonte que o Skia enxerga no Android tem o katakana meia-largura do
// desktop (aparecia como quadradinhos), e o Skia não troca de fonte sozinho. A Matrix do app usa só ASCII,
// que a fonte monoespaçada de qualquer Android tem.
describe('Matrix: caracteres', () => {
  it('só ASCII visível, sem repetição e em quantidade suficiente para parecer chuva de código', () => {
    expect(MATRIX_GLYPHS.length).toBeGreaterThanOrEqual(30)
    expect(new Set(MATRIX_GLYPHS).size).toBe(MATRIX_GLYPHS.length)
    for (const g of MATRIX_GLYPHS) expect(g).toMatch(/^[\x21-\x7e]$/)
  })

  it('tem dígitos e letras', () => {
    expect(MATRIX_GLYPHS.join('')).toMatch(/[0-9]/)
    expect(MATRIX_GLYPHS.join('')).toMatch(/[A-Z]/)
  })
})
