// Arquivos dos emojis no Cache Storage, guardados pelo id (sem o media token).
// A URL do servidor leva o token da sessão, então o cache HTTP do navegador
// baixa tudo de novo a cada abertura do app; o emoji é imutável, então aqui
// ele é baixado uma vez e reaproveitado entre sessões.

const CACHE_NAME = 'concord-emojis-v1'

const keyOf = (id: string): string => `/emoji-cache/${encodeURIComponent(id)}`

async function open(): Promise<Cache | null> {
  try {
    return typeof caches === 'undefined' ? null : await caches.open(CACHE_NAME)
  } catch {
    return null // modo privado, cota estourada...
  }
}

/** URL local (blob) do emoji se já foi baixado antes; senão null. */
export async function readEmojiDisk(id: string): Promise<string | null> {
  try {
    const hit = await (await open())?.match(keyOf(id))
    return hit ? URL.createObjectURL(await hit.blob()) : null
  } catch {
    return null
  }
}

/** Baixa o emoji pela URL com token e guarda pelo id. Falha não propaga. */
export async function saveEmojiDisk(id: string, tokenUrl: string): Promise<void> {
  try {
    const cache = await open()
    if (!cache) return
    const res = await fetch(tokenUrl)
    if (res.ok) await cache.put(keyOf(id), res)
  } catch {
    // sem disco ou sem rede: o <img> segue pela URL normal
  }
}

/** Troca de conta: o que a pessoa anterior podia ver não fica para a próxima. */
export async function clearEmojiDisk(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') await caches.delete(CACHE_NAME)
  } catch {
    // nada a limpar
  }
}
