import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ScreenCelebration } from '../hooks/useScreenCelebration'

let celebration: ScreenCelebration | null = null
vi.mock('../hooks/useScreenCelebration', () => ({ useScreenCelebration: () => celebration }))
vi.mock('./Crown', () => ({ default: () => <i data-coroa /> }))

import { renderToStaticMarkup } from 'react-dom/server'
import LevelUpScreen from './LevelUpScreen'

const at = (level: number): ScreenCelebration => ({
  key: 1,
  userId: 'u1',
  level,
  previous: level - 1,
  own: true
})

describe('LevelUpScreen', () => {
  beforeEach(() => {
    celebration = null
  })

  it('nível baixo: nada na tela inteira', () => {
    celebration = at(3)
    expect(renderToStaticMarkup(<LevelUpScreen />)).toBe('')
  })

  it('lendário: aurora, estrelas caindo, coroa e o nível', () => {
    celebration = at(101)
    const html = renderToStaticMarkup(<LevelUpScreen />)
    expect(html).toContain('level-star-fall')
    expect(html).toContain('data-coroa')
    expect(html).toContain('LENDÁRIO')
    expect(html).toContain('Nível 101')
  })
})
