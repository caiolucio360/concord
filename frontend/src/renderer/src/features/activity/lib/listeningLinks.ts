import type { ListeningActivity } from './listeningActivity'

// "Ouvir também": links de busca nos serviços de música a partir da faixa que a
// pessoa está ouvindo. A atividade só guarda app, título, artista e álbum (sem
// URL nem ID da faixa), então é sempre busca por "artista - título". Puro.

/** Igual ao limite do servidor para a busca do Maestro (music.queryMax). */
const QUERY_MAX = 200

export interface ListeningLink {
  /** Nome do serviço ("YouTube Music"); é também o nome no catálogo de players (ícone e cor). */
  label: string
  /** Busca no serviço; sempre http(s). */
  url: string
}

const SERVICES: readonly { label: string; search: (q: string) => string }[] = [
  { label: 'YouTube', search: (q) => `https://www.youtube.com/results?search_query=${q}` },
  { label: 'Spotify', search: (q) => `https://open.spotify.com/search/${q}` },
  { label: 'YouTube Music', search: (q) => `https://music.youtube.com/search?q=${q}` },
  { label: 'Deezer', search: (q) => `https://www.deezer.com/search/${q}` },
  { label: 'Apple Music', search: (q) => `https://music.apple.com/search?term=${q}` }
]

/** "Elis Regina - Águas de Março"; sem artista, só o título. */
export function listeningQuery(listening: ListeningActivity): string {
  const title = listening.title.trim()
  const artist = listening.artist?.trim()
  return (artist ? `${artist} - ${title}` : title).slice(0, QUERY_MAX)
}

export function listeningLinks(listening: ListeningActivity): ListeningLink[] {
  const q = encodeURIComponent(listeningQuery(listening))
  return SERVICES.map((s) => ({ label: s.label, url: s.search(q) }))
}
