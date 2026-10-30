import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScreenCelebration } from '../hooks/useScreenCelebration'

let celebration: ScreenCelebration | null = null
vi.mock('../hooks/useScreenCelebration', () => ({ useScreenCelebration: () => celebration }))
vi.mock('../../call/store/callStore', () => ({ useCallStore: { getState: () => ({ deafened: false }) } }))
vi.mock('../../call/lib/sounds', () => ({ oncePerKey: () => () => true, playSound: vi.fn() }))
vi.mock('./LevelBadge', () => ({ default: () => <i data-selo /> }))

import { renderToStaticMarkup } from 'react-dom/server'
import LevelUpBanner from './LevelUpBanner'

const at = (level: number, over: Partial<ScreenCelebration> = {}): ScreenCelebration => ({
  key: 1,
  userId: 'u1',
  level,
  previous: level - 1,
  own: true,
  ...over
})

describe('LevelUpBanner', () => {
  beforeEach(() => {
    celebration = null
  })

  it('sem celebração, nada', () => {
    expect(renderToStaticMarkup(<LevelUpBanner />)).toBe('')
  })

  it('a sua subida: título, faixa e selo', () => {
    celebration = at(3)
    const html = renderToStaticMarkup(<LevelUpBanner />)
    expect(html).toContain('role="status"')
    expect(html).toContain('Você subiu de nível!')
    expect(html).toContain('Faixa ')
    expect(html).toContain('data-selo')
  })

  it('a de outra pessoa, no nível alto: borda girando e emblema', () => {
    celebration = at(85, { own: false, name: 'Ana' })
    const html = renderToStaticMarkup(<LevelUpBanner />)
    expect(html).toContain('Ana está no nível 85')
    expect(html).toContain('level-border-spin')
    expect(html).toContain('<polygon')
  })

  it('nova faixa aparece em destaque', () => {
    celebration = at(20, { previous: 19 })
    expect(renderToStaticMarkup(<LevelUpBanner />)).toContain('Nova faixa:')
  })
})
