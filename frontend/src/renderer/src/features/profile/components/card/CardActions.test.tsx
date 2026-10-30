import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('../../../../app/router', () => ({ default: { navigate: vi.fn() } }))

const { default: CardActions } = await import('./CardActions')

const render = (over: Partial<Parameters<typeof CardActions>[0]> = {}): string =>
  renderToStaticMarkup(
    <CardActions
      userId="u1"
      name="Ana"
      displayName="Ana"
      username="ana_1"
      onClose={() => {}}
      {...over}
    />
  )

describe('CardActions', () => {
  it('com vínculo: mensagem, amizade e mais', () => {
    const html = render({ relationship: 'shared_server' })
    expect(html).toContain('Enviar mensagem')
    expect(html).toContain('Adicionar amigo')
    expect(html).toContain('aria-label="Mais"')
  })

  it('sem vínculo (aberto pelo ranking): nenhum atalho para DM ou amizade', () => {
    const html = render({ relationship: 'none', username: undefined })
    expect(html).not.toContain('Enviar mensagem')
    expect(html).not.toContain('Adicionar amigo')
    expect(html).not.toContain('aria-label="Mais"')
  })

  it('sem vínculo mesmo com o @ guardado de antes: sem atalhos', () => {
    const html = render({ relationship: 'none' })
    expect(html).toBe('')
  })
})
