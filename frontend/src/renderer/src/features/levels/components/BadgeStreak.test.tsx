import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import BadgeStreak from './BadgeStreak'

describe('BadgeStreak', () => {
  it('próprio perfil: dias seguidos, recorde e aviso quando em risco', () => {
    const html = renderToStaticMarkup(
      <BadgeStreak streak={{ current: 5, longest: 9, at_risk: true }} isMe />
    )
    expect(html).toContain('5 dias seguidos')
    expect(html).toContain('Recorde: 9 dias')
    expect(html).toContain('Use a Salinha hoje para manter a sequência')
    expect(html).toContain('<svg')
  })

  it('perfil de outra pessoa: só a sequência atual', () => {
    const html = renderToStaticMarkup(<BadgeStreak streak={{ current: 4 }} isMe={false} />)
    expect(html).toContain('4 dias seguidos')
    expect(html).not.toContain('Recorde')
    expect(html).not.toContain('Use a Salinha')
  })

  it('sem dados do servidor, não renderiza', () => {
    expect(renderToStaticMarkup(<BadgeStreak streak={undefined} isMe />)).toBe('')
  })
})
