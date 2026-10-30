import { describe, expect, it } from 'vitest'
import { isSafeExternalUrl } from '../../../../../shared/externalUrl'
import { listeningLinks, listeningQuery } from './listeningLinks'
import type { ListeningActivity } from './listeningActivity'

const track = (extra: Partial<ListeningActivity> = {}): ListeningActivity => ({
  app: 'Spotify',
  title: 'Águas de Março',
  started_at: 1,
  ...extra
})

describe('listeningQuery', () => {
  it('"artista - título" quando há artista', () => {
    expect(listeningQuery(track({ artist: 'Elis Regina' }))).toBe('Elis Regina - Águas de Março')
  })

  it('só o título sem artista', () => {
    expect(listeningQuery(track())).toBe('Águas de Março')
  })

  it('tira espaços sobrando e limita ao que o servidor aceita', () => {
    expect(listeningQuery(track({ artist: '  Elis  ', title: ' X ' }))).toBe('Elis - X')
    expect(listeningQuery(track({ title: 'a'.repeat(300) }))).toHaveLength(200)
  })
})

describe('listeningLinks', () => {
  const links = listeningLinks(track({ artist: 'Elis & Tom' }))

  it('um link de busca por serviço, na ordem YouTube, Spotify, YouTube Music, Deezer, Apple Music', () => {
    expect(links.map((l) => l.label)).toEqual([
      'YouTube',
      'Spotify',
      'YouTube Music',
      'Deezer',
      'Apple Music'
    ])
  })

  it('codifica "artista - título" na URL de cada serviço', () => {
    const q = encodeURIComponent('Elis & Tom - Águas de Março')
    expect(links[0].url).toBe(`https://www.youtube.com/results?search_query=${q}`)
    expect(links[1].url).toBe(`https://open.spotify.com/search/${q}`)
    expect(links[2].url).toBe(`https://music.youtube.com/search?q=${q}`)
    expect(links[3].url).toBe(`https://www.deezer.com/search/${q}`)
    expect(links[4].url).toBe(`https://music.apple.com/search?term=${q}`)
  })

  it('todo link passa no filtro de links externos do app', () => {
    for (const link of links) expect(isSafeExternalUrl(link.url)).toBe(true)
  })
})
