import { ensureMediaToken } from '../../chat/store/mediaToken'
import { emojiFileUrl } from '../api/emojis'
import { clearEmojiDisk, readEmojiDisk, saveEmojiDisk } from '../lib/emojiDisk'

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
  // Baixado em outra sessão: sai do disco, sem media token e sem rede.
  const local = await readEmojiDisk(id)
  const url = local ?? emojiFileUrl(id, await ensureMediaToken())
  // Duas cargas ao mesmo tempo: fica a primeira, para a URL não mudar.
  if (!urls.has(id)) {
    urls.set(id, url)
    if (!local) void saveEmojiDisk(id, url)
  }
  return urls.get(id) as string
}

/** Troca de conta (as URLs levam o token da pessoa) e testes. */
export function clearEmojiSrcs(): void {
  urls.clear()
  retried.clear()
  void clearEmojiDisk()
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

// URLs que já falharam e foram refeitas: cada uma tenta de novo uma vez só
// (não membro ou emoji apagado continuam falhando, sem laço).
const retried = new Set<string>()

/**
 * A imagem falhou (ex.: o media token da URL venceu antes de o <img> carregar):
 * esquece a URL e entrega uma nova, com o token atual. Uma vez por URL.
 */
export function retryEmojiSrc(id: string, failedUrl: string, onSrc: (url: string) => void): void {
  if (retried.has(failedUrl)) return
  retried.add(failedUrl)
  if (urls.get(id) === failedUrl) urls.delete(id)
  subscribeEmojiSrc(id, true, onSrc)
}
