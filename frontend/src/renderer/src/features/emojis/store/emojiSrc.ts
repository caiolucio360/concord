import { ensureMediaToken } from '../../chat/store/mediaToken'
import { emojiFileUrl } from '../api/emojis'

// URL de cada emoji, montada uma vez por sessão: a mesma string em todas as
// mensagens faz o navegador reaproveitar o cache (o arquivo é immutable) e a
// imagem já decodificada, mesmo depois que o media token renova.
const urls = new Map<string, string>()

export function cachedEmojiSrc(id: string): string | undefined {
  return urls.get(id)
}

export async function loadEmojiSrc(id: string): Promise<string> {
  const cached = urls.get(id)
  if (cached) return cached
  const url = emojiFileUrl(id, await ensureMediaToken())
  // Duas cargas ao mesmo tempo: fica a primeira, para a URL não mudar.
  if (!urls.has(id)) urls.set(id, url)
  return urls.get(id) as string
}

/** Só para testes e troca de conta. */
export function clearEmojiSrcs(): void {
  urls.clear()
}

export function primeEmojiSrc(id: string, url: string): void {
  urls.set(id, url)
}

/**
 * Entrega a URL do emoji a `onSrc` (na hora, se já tem; senão quando o media
 * token chegar). Devolve o cancelamento, para o efeito do React.
 */
export function subscribeEmojiSrc(
  id: string,
  enabled: boolean,
  onSrc: (url: string) => void
): () => void {
  const cached = cachedEmojiSrc(id)
  if (!enabled || cached) {
    if (enabled && cached) onSrc(cached)
    return () => {}
  }
  let active = true
  loadEmojiSrc(id)
    .then((url) => {
      if (active) onSrc(url)
    })
    .catch(() => {})
  return () => {
    active = false
  }
}
