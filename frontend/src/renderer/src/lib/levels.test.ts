import { describe, expect, it } from 'vitest'
import {
  formatVoiceTime,
  isMilestone,
  LEGENDARY_TIER,
  levelPercent,
  levelTier,
  minutesToNext,
  fatigueState,
  sparkCount
} from './levels'

describe('levelTier', () => {
  it('muda de faixa a cada 10 níveis', () => {
    expect(levelTier(1).name).toBe('Bronze')
    expect(levelTier(9).name).toBe('Bronze')
    expect(levelTier(10).name).toBe('Prata')
    expect(levelTier(25).name).toBe('Ouro')
    expect(levelTier(99).name).toBe('Celestial')
  })

  it('do 100 em diante é lendário, sem limite', () => {
    expect(levelTier(100)).toBe(LEGENDARY_TIER)
    expect(levelTier(4321)).toBe(LEGENDARY_TIER)
  })
})

describe('animação', () => {
  it('marcos são os níveis redondos', () => {
    expect(isMilestone(10)).toBe(true)
    expect(isMilestone(100)).toBe(true)
    expect(isMilestone(11)).toBe(false)
  })

  it('mais faíscas conforme sobe, com teto', () => {
    expect(sparkCount(2)).toBe(8)
    expect(sparkCount(15)).toBeGreaterThan(sparkCount(5))
    expect(sparkCount(20)).toBeGreaterThan(sparkCount(21))
    expect(sparkCount(999)).toBe(24)
  })
})

describe('progresso', () => {
  it('percentual e minutos restantes', () => {
    expect(levelPercent(77, 155)).toBe(49)
    expect(levelPercent(0, 0)).toBe(0)
    expect(minutesToNext(150, 155)).toBe(1)
    expect(minutesToNext(0, 155)).toBe(31)
  })

  it('formata o tempo de voz', () => {
    expect(formatVoiceTime(45 * 60)).toBe('45 min')
    expect(formatVoiceTime(200 * 60)).toBe('3 h 20 min')
    expect(formatVoiceTime(12 * 3600)).toBe('12 h')
  })
})

describe('fatigueState', () => {
  it('2 h cheias, até 4 h pela metade, depois acabou o XP do dia', () => {
    expect(fatigueState(0)).toBe('full')
    expect(fatigueState(2 * 3600 - 1)).toBe('full')
    expect(fatigueState(2 * 3600)).toBe('tired')
    expect(fatigueState(4 * 3600)).toBe('done')
  })
})
