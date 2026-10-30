import type { ChangelogRelease } from '../api/changelog'
import { formatReleaseDate, groupEntries, withContent } from './changelog'

const release: ChangelogRelease = {
  version: '1.2.0',
  released_at: '2026-10-29T12:00:00Z',
  summary: '',
  entries: [
    { kind: 'feature', text: 'A' },
    { kind: 'fix', text: 'B' },
    { kind: 'feature', text: 'C' }
  ]
}

describe('changelog', () => {
  it('separa novidades de correções mantendo a ordem', () => {
    expect(groupEntries(release)).toEqual({ features: ['A', 'C'], fixes: ['B'] })
  })

  // O servidor devolve também as versões sem notas (o desktop precisa delas para
  // mostrar "você está aqui"); o app, sem esse marcador, só lista as que contam algo.
  it('esconde as versões sem notas nem resumo', () => {
    const empty = { ...release, version: '1.1.0', entries: [] }
    const withSummary = { ...empty, version: '1.0.0', summary: 'Primeira versão' }
    expect(withContent([release, empty, withSummary]).map((r) => r.version)).toEqual(['1.2.0', '1.0.0'])
  })

  it('formata a data em UTC e devolve vazio se for inválida', () => {
    expect(formatReleaseDate('2026-10-29T00:30:00Z')).toBe('29 de outubro de 2026')
    expect(formatReleaseDate('lixo')).toBe('')
  })
})
