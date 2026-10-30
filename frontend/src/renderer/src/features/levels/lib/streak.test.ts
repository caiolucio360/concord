import { describe, expect, it } from 'vitest'
import { streakLines, streakTooltip } from './streak'

describe('streakLines (modal do badge Sequência)', () => {
  it('própria pessoa: atual, recorde e aviso quando hoje ainda não contou', () => {
    expect(streakLines({ current: 5, longest: 9, at_risk: true }, true)).toEqual({
      main: '5 dias seguidos',
      record: 'Recorde: 9 dias',
      warning: 'Use o Salinha hoje para manter a sequência'
    })
  })

  it('já contou hoje: sem aviso', () => {
    expect(streakLines({ current: 1, longest: 1, at_risk: false }, true)).toEqual({
      main: '1 dia seguido',
      record: 'Recorde: 1 dia',
      warning: null
    })
  })

  it('sequência quebrada: mostra 0 e o recorde, sem aviso', () => {
    expect(streakLines({ current: 0, longest: 12, at_risk: false }, true)).toEqual({
      main: 'Sem sequência no momento',
      record: 'Recorde: 12 dias',
      warning: null
    })
  })

  it('outra pessoa: só a sequência atual', () => {
    expect(streakLines({ current: 4 }, false)).toEqual({
      main: '4 dias seguidos',
      record: null,
      warning: null
    })
  })

  it('sem dados (servidor antigo): nada', () => {
    expect(streakLines(undefined, true)).toBeNull()
  })
})

describe('streakTooltip (fileira do perfil)', () => {
  it('só quando há sequência ativa', () => {
    expect(streakTooltip({ current: 3 })).toBe('3 dias seguidos')
    expect(streakTooltip({ current: 0 })).toBeNull()
    expect(streakTooltip(undefined)).toBeNull()
  })
})
