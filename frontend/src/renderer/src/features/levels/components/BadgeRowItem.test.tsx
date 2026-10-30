import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Badge } from '../api/badges'
import BadgeRowItem from './BadgeRowItem'

const sequencia: Badge = {
  category: 'sequencia',
  name: 'Sequência',
  description: '',
  unit: 'days',
  tier: 2,
  tier_name: 'Foguinho',
  rarity: 'comum',
  tiers: []
}

describe('BadgeRowItem', () => {
  it('Sequência mostra os dias seguidos no tooltip', () => {
    const html = renderToStaticMarkup(
      <BadgeRowItem badge={sequencia} streak={{ current: 4 }} onOpen={() => {}} />
    )
    expect(html).toContain('Foguinho')
    expect(html).toContain('4 dias seguidos')
  })

  it('sequência quebrada ou ausente: sem linha de dias', () => {
    for (const streak of [undefined, { current: 0 }]) {
      const html = renderToStaticMarkup(
        <BadgeRowItem badge={sequencia} streak={streak} onOpen={() => {}} />
      )
      expect(html).not.toContain('dias seguidos')
    }
  })

  it('outros badges nunca mostram a sequência', () => {
    const html = renderToStaticMarkup(
      <BadgeRowItem
        badge={{ ...sequencia, category: 'mensagens', name: 'Mensagens', tier_name: 'Puxa' }}
        streak={{ current: 4 }}
        onOpen={() => {}}
      />
    )
    expect(html).not.toContain('dias seguidos')
  })
})
