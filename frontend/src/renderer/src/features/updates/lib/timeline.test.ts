import { describe, expect, it } from 'vitest'
import type { ChangelogRelease } from '../api/changelog'
import { buildTimeline, compareVersions } from './timeline'

const rel = (version: string, texts: string[] = [], summary = ''): ChangelogRelease => ({
  version,
  released_at: '2026-10-24T15:00:00Z',
  summary,
  entries: texts.map((text) => ({ kind: 'feature' as const, text }))
})

const shape = (items: ReturnType<typeof buildTimeline>): string[] =>
  items.map((i) =>
    i.kind === 'quiet' ? `quiet:${i.versions.join(',')}` : `${i.release.version}${i.current ? '*' : ''}`
  )

describe('compareVersions', () => {
  it('compara número a número, não texto', () => {
    expect(compareVersions('0.10.0', '0.9.9')).toBeGreaterThan(0)
    expect(compareVersions('0.6.2', '0.6.10')).toBeLessThan(0)
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0)
  })
})

describe('buildTimeline', () => {
  it('marca a versão instalada', () => {
    const items = buildTimeline([rel('0.6.3', ['a']), rel('0.6.2', ['b'])], '0.6.2')
    expect(shape(items)).toEqual(['0.6.3', '0.6.2*'])
  })

  // Regressão: a release instalada sumia quando ficava sem notas, e o usuário
  // não via "onde estou".
  it('mantém a versão instalada mesmo sem notas', () => {
    const items = buildTimeline([rel('0.6.3', ['a']), rel('0.6.2'), rel('0.6.1', ['b'])], '0.6.2')
    expect(shape(items)).toEqual(['0.6.3', '0.6.2*', '0.6.1'])
  })

  it('recolhe releases seguidas sem notas numa linha só', () => {
    const items = buildTimeline(
      [rel('0.6.5', ['a']), rel('0.6.4'), rel('0.6.3'), rel('0.6.2', ['b']), rel('0.6.1')],
      '0.6.5'
    )
    expect(shape(items)).toEqual(['0.6.5*', 'quiet:0.6.4,0.6.3', '0.6.2', 'quiet:0.6.1'])
  })

  it('release só com resumo não é recolhida', () => {
    expect(shape(buildTimeline([rel('0.6.2', [], 'Primeira versão')], null))).toEqual(['0.6.2*'])
  })

  it('a instalada no meio de várias vazias parte a linha recolhida em duas', () => {
    const items = buildTimeline([rel('0.6.4'), rel('0.6.3'), rel('0.6.2')], '0.6.3')
    expect(shape(items)).toEqual(['quiet:0.6.4', '0.6.3*', 'quiet:0.6.2'])
  })

  // Deploy novo ainda sem changelog publicado: o app já é a 0.6.4.
  it('versão instalada fora da lista entra no lugar certo', () => {
    const items = buildTimeline([rel('0.6.3', ['a']), rel('0.6.1', ['b'])], '0.6.4')
    expect(shape(items)).toEqual(['0.6.4*', '0.6.3', '0.6.1'])
    const between = buildTimeline([rel('0.6.3', ['a']), rel('0.6.1', ['b'])], '0.6.2')
    expect(shape(between)).toEqual(['0.6.3', '0.6.2*', '0.6.1'])
  })

  // Web: sempre é a versão mais nova do último deploy.
  it('sem versão instalada (web), a mais nova é a atual', () => {
    expect(shape(buildTimeline([rel('0.6.3', ['a']), rel('0.6.2', ['b'])], null))).toEqual(['0.6.3*', '0.6.2'])
  })

  it('lista vazia e sem versão não tem o que mostrar', () => {
    expect(buildTimeline([], null)).toEqual([])
  })

  // Carregando ou com erro: um cartão só da versão instalada ao lado do esqueleto
  // pareceria uma lista com uma versão só.
  it('sem releases do servidor não inventa a versão instalada', () => {
    expect(buildTimeline([], '0.6.4')).toEqual([])
  })
})
