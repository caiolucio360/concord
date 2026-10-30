import { describe, expect, it } from 'vitest'
import { bannerShadow, levelUpHeadline } from './levelUpBanner'
import { levelUpEffects } from './levels'

const marco = { level: 50 } as NonNullable<Parameters<typeof levelUpHeadline>[1]>

describe('levelUpHeadline', () => {
  it('a sua subida, com e sem marco', () => {
    expect(levelUpHeadline({ level: 3, own: true }, null)).toBe('Você subiu de nível!')
    expect(levelUpHeadline({ level: 50, own: true }, marco)).toBe('Marco 50 alcançado!')
  })

  it('a de outra pessoa, com o nome ou "Essa pessoa"', () => {
    expect(levelUpHeadline({ level: 7, own: false, name: 'Ana' }, null)).toBe('Ana está no nível 7')
    expect(levelUpHeadline({ level: 50, own: false }, marco)).toBe('Essa pessoa chegou ao marco 50')
  })
})

describe('bannerShadow', () => {
  it('cresce com o brilho e usa a cor da faixa', () => {
    const tier = levelUpEffects(10).tier
    expect(bannerShadow({ glow: 0, tier })).toBe(`0 0 18px ${tier.color}40`)
    expect(bannerShadow({ glow: 1, tier })).toBe(`0 0 60px ${tier.color}c0`)
    expect(bannerShadow({ glow: 2, tier })).toMatch(/c0$/)
  })
})
