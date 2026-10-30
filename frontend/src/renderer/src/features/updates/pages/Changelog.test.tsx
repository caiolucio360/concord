import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ChangelogView } from './Changelog'

const releases = [
  {
    version: '0.6.2',
    released_at: '2026-10-24T15:00:00Z',
    summary: '',
    entries: [
      { kind: 'feature' as const, text: 'Mensagens fixadas' },
      { kind: 'fix' as const, text: 'Som da chamada' }
    ]
  },
  { version: '0.6.1', released_at: '2026-10-20T15:00:00Z', summary: '', entries: [] }
]

const render = (over: Partial<Parameters<typeof ChangelogView>[0]> = {}): string =>
  renderToStaticMarkup(
    <ChangelogView releases={releases} current={null} loading={false} error={null} {...over} />
  )

describe('ChangelogView', () => {
  it('mostra versão, novidades e correções', () => {
    const html = render()
    expect(html).toContain('v0.6.2')
    expect(html).toContain('Novidades')
    expect(html).toContain('Mensagens fixadas')
    expect(html).toContain('Correções')
    expect(html).toContain('Som da chamada')
  })

  it('marca a versão em uso', () => {
    const html = render({ current: '0.6.2' })
    expect(html).toContain('Você está aqui')
    expect(html.split('Você está aqui')).toHaveLength(2)
  })

  // Regressão: a versão instalada sem notas sumia da lista.
  it('mostra a versão em uso mesmo sem notas', () => {
    const html = render({ current: '0.6.1' })
    expect(html).toContain('v0.6.1')
    expect(html).toContain('Você está aqui')
    expect(html).toContain('Sem notas para esta versão')
  })

  it('na web (sem versão instalada) a mais nova é a atual', () => {
    const html = render({ current: null })
    expect(html.indexOf('Você está aqui')).toBeGreaterThan(html.indexOf('v0.6.2'))
    expect(html.indexOf('Você está aqui')).toBeLessThan(html.indexOf('Mensagens fixadas'))
  })

  it('versões sem notas que não são a atual viram uma linha só', () => {
    const quiet = [
      releases[0],
      { ...releases[1], version: '0.6.1' },
      { ...releases[1], version: '0.6.0' }
    ]
    const html = render({ releases: quiet })
    expect(html).toContain('v0.6.1 a v0.6.0')
    expect(html).toContain('sem mudanças visíveis')
    expect(html).not.toContain('Sem notas para esta versão')
  })

  it('marca a atual e rola até ela depois de carregar', () => {
    expect(render({ current: '0.6.2' })).toContain('data-current-release')
  })

  it('carregando, com erro e vazio', () => {
    expect(render({ loading: true, releases: [] })).toContain('Carregando')
    expect(render({ error: 'falhou', releases: [] })).toContain('falhou')
    expect(render({ releases: [] })).toContain('Nenhuma versão publicada ainda')
  })
})
