import type { ChangelogRelease } from '../api/changelog'
import { formatReleaseDate, groupEntries } from './changelog'

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

  it('formata a data em UTC e devolve vazio se for inválida', () => {
    expect(formatReleaseDate('2026-10-29T00:30:00Z')).toBe('29 de outubro de 2026')
    expect(formatReleaseDate('lixo')).toBe('')
  })
})
