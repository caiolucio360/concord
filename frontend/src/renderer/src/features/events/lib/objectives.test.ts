import { describe, expect, it } from 'vitest'
import {
  DIFFICULTIES,
  KINDS,
  MAX_OBJECTIVES,
  OBJECTIVE_MINUTES,
  emptyObjective,
  formatXp,
  minutesOptions,
  objectiveTitle,
  objectiveToast,
  progressPercent
} from './objectives'

describe('objetivos do evento', () => {
  it('os limites e as metas são os da spec', () => {
    expect(MAX_OBJECTIVES).toBe(3)
    expect(OBJECTIVE_MINUTES).toEqual([15, 30, 45, 60, 90, 120])
  })

  it('os rótulos de tipo e dificuldade são os aprovados', () => {
    expect(KINDS.map((k) => k.label)).toEqual(['Ficar na sala', 'Jogar o jogo do evento'])
    expect(DIFFICULTIES.map((d) => d.label)).toEqual(['Fácil', 'Médio', 'Difícil'])
    expect(DIFFICULTIES.map((d) => d.value)).toEqual(['easy', 'medium', 'hard'])
  })

  it('só oferece metas que cabem na duração do evento', () => {
    expect(minutesOptions(30)).toEqual([15, 30])
    expect(minutesOptions(120)).toEqual([15, 30, 45, 60, 90, 120])
    expect(minutesOptions(10)).toEqual([])
  })

  it('gera o título do tipo, da meta e do jogo', () => {
    expect(objectiveTitle({ kind: 'time', minutes: 30 }, null)).toBe('Ficar 30 min na sala do evento')
    expect(objectiveTitle({ kind: 'time', minutes: 30 }, 'Minecraft')).toBe('Ficar 30 min na sala do evento')
    expect(objectiveTitle({ kind: 'game', minutes: 30 }, 'Minecraft')).toBe('Jogar Minecraft por 30 min')
    expect(objectiveTitle({ kind: 'game', minutes: 60 }, null)).toBe('Jogar o jogo do evento por 60 min')
  })

  it('calcula a porcentagem da barra, sem passar de 100', () => {
    expect(progressPercent(0, 30)).toBe(0)
    expect(progressPercent(12, 30)).toBe(40)
    expect(progressPercent(45, 30)).toBe(100)
    expect(progressPercent(5, 0)).toBe(0)
  })

  it('formata o XP com ponto de milhar', () => {
    expect(formatXp(0)).toBe('0')
    expect(formatXp(400)).toBe('400')
    expect(formatXp(1000)).toBe('1.000')
    expect(formatXp(6000)).toBe('6.000')
    expect(formatXp(1234567)).toBe('1.234.567')
  })

  it('monta o aviso de objetivo cumprido, com e sem o teto diário', () => {
    expect(objectiveToast('Ficar 30 min na sala do evento', 1000, false)).toBe(
      'Objetivo cumprido: Ficar 30 min na sala do evento. +1.000 XP'
    )
    expect(objectiveToast('Ficar 30 min na sala do evento', 400, true)).toBe(
      'Objetivo cumprido: Ficar 30 min na sala do evento. +400 XP (limite diário de XP de eventos)'
    )
  })

  it('o objetivo novo começa fácil, de tempo e de 15 min', () => {
    expect(emptyObjective()).toEqual({ kind: 'time', difficulty: 'easy', minutes: 15 })
  })
})
