import { describe, expect, it, vi } from 'vitest'

const store = vi.hoisted(() => ({ byUser: {} as Record<string, unknown> }))
vi.mock('../store/badgeStore', () => ({
  useBadgeStore: (select: (s: unknown) => unknown) =>
    select({ byUser: store.byUser, ensureBadges: () => Promise.resolve(), openModal: () => {} })
}))

import { renderToStaticMarkup } from 'react-dom/server'
import BadgeRow from './BadgeRow'

const badge = (category: string, tier = 1): unknown => ({
  category,
  name: category,
  description: '',
  unit: 'days',
  tier,
  tier_name: `T-${category}`,
  rarity: 'comum',
  tiers: []
})

describe('BadgeRow', () => {
  it('sem resposta ainda: skeleton', () => {
    store.byUser = {}
    expect(renderToStaticMarkup(<BadgeRow userId="u1" name="Ana" />)).toContain('aria-busy="true"')
  })

  it('sem badges conquistados: nada', () => {
    store.byUser = { u1: { badges: [], streak: undefined } }
    expect(renderToStaticMarkup(<BadgeRow userId="u1" name="Ana" />)).toBe('')
  })

  it('mostra os badges, a sequência no tooltip e o "+N" do resto', () => {
    store.byUser = {
      u1: { badges: [badge('sequencia'), badge('a'), badge('b')], streak: { current: 5 } }
    }
    const html = renderToStaticMarkup(<BadgeRow userId="u1" name="Ana" max={2} />)
    expect(html).toContain('5 dias seguidos')
    expect(html).toContain('+1')
  })
})
