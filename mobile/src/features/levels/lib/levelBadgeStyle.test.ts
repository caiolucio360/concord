import { levelBadgeStyle, PRIDE_COLORS, SPECIAL_BADGE_LEVELS } from './levelBadgeStyle'
import { levelTier } from './levels'

describe('levelBadgeStyle', () => {
  it('nível comum: degradê da faixa, texto escuro e "Nv" apagado', () => {
    const tier = levelTier(12)
    expect(levelBadgeStyle(12)).toEqual({ variant: 'faixa', colors: [tier.color, tier.accent], stripes: false, text: '#0b0b0f', dimLabel: true })
    expect(levelTier(5).name).toBe('Bronze')
    expect(levelTier(95).name).toBe('Celestial')
  })

  it('níveis 13, 14, 22 e 24 têm selo próprio; o 24 é o orgulho em faixas duras', () => {
    expect(SPECIAL_BADGE_LEVELS).toEqual([13, 14, 22, 24])
    expect(levelBadgeStyle(13).variant).toBe('estrelas')
    expect(levelBadgeStyle(14).variant).toBe('onca')
    expect(levelBadgeStyle(22).variant).toBe('brasil')
    const pride = levelBadgeStyle(24)
    expect(pride).toMatchObject({ variant: 'orgulho', stripes: true, colors: PRIDE_COLORS, dimLabel: false })
  })

  it('do 100 em diante é o lendário', () => {
    expect(levelBadgeStyle(100).variant).toBe('lendario')
    expect(levelBadgeStyle(250).variant).toBe('lendario')
    expect(levelTier(100).name).toBe('Lendário')
  })
})
