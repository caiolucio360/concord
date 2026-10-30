import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSpreadRefresh } from './spreadRefresh'

describe('createSpreadRefresh', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('roda depois de um atraso sorteado até o máximo', () => {
    const schedule = createSpreadRefresh({ maxDelayMs: 1000, random: () => 0.5 })
    const run = vi.fn()

    schedule('s1', run)
    vi.advanceTimersByTime(499)
    expect(run).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('invalidações seguidas do mesmo servidor viram uma releitura só', () => {
    const schedule = createSpreadRefresh({ maxDelayMs: 1000, random: () => 0.9 })
    const run = vi.fn()

    schedule('s1', run)
    schedule('s1', run)
    schedule('s1', run)
    vi.advanceTimersByTime(1000)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('depois de rodar, a próxima invalidação agenda de novo; servidores não se misturam', () => {
    const schedule = createSpreadRefresh({ maxDelayMs: 1000, random: () => 0 })
    const s1 = vi.fn()
    const s2 = vi.fn()

    schedule('s1', s1)
    schedule('s2', s2)
    vi.advanceTimersByTime(0)
    schedule('s1', s1)
    vi.advanceTimersByTime(0)
    expect(s1).toHaveBeenCalledTimes(2)
    expect(s2).toHaveBeenCalledTimes(1)
  })
})
