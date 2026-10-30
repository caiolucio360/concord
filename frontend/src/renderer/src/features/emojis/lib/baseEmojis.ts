import { EMOTE_CATEGORIES, type EmoteCategory, type EmoteItem } from '../../chat/lib/emotes'

/** Resposta do GET /emojis/base (chaves curtas: ~1.900 emojis). */
export interface BasePack {
  groups: { id: number; name: string }[]
  emojis: { e: string; l: string; k?: string[]; g: number }[]
}

/** Emoji com o texto de busca já pronto (minúsculo e sem acento). */
interface SearchableItem extends EmoteItem {
  haystack?: string
}

/** Resultados demais travam a grade; a busca para aqui. */
export const MAX_SEARCH_RESULTS = 200

export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function haystackOf(item: EmoteItem): string {
  return normalizeSearch([item.label, ...item.keywords].join(' '))
}

/** Os Frequentes locais primeiro e depois um grupo do pack por categoria. */
export function basePackToCategories(pack: BasePack): EmoteCategory[] {
  const byGroup = new Map<number, SearchableItem[]>()
  for (const g of pack.groups) byGroup.set(g.id, [])
  for (const e of pack.emojis) {
    const item: SearchableItem = { emoji: e.e, label: e.l, keywords: e.k ?? [] }
    item.haystack = haystackOf(item)
    byGroup.get(e.g)?.push(item)
  }
  const groups = pack.groups.map((g) => ({
    id: `base-${g.id}`,
    name: g.name,
    items: byGroup.get(g.id) ?? []
  }))
  return [EMOTE_CATEGORIES[0], ...groups]
}

/**
 * Filtra as categorias pela busca (rótulo e palavras-chave, sem acento), com
 * no máximo `limit` emojis no total. Busca vazia devolve a mesma lista.
 */
export function searchCategories(
  categories: EmoteCategory[],
  query: string,
  limit = MAX_SEARCH_RESULTS
): EmoteCategory[] {
  const q = normalizeSearch(query.trim())
  if (!q) return categories
  const out: EmoteCategory[] = []
  const seen = new Set<string>()
  let left = limit
  for (const cat of categories) {
    if (left <= 0) break
    const items = matching(cat.items, q, seen, left)
    left -= items.length
    if (items.length) out.push({ ...cat, items })
  }
  return out
}

/** Os emojis da categoria que batem com a busca, sem repetir (Frequentes também está nos grupos). */
function matching(items: SearchableItem[], q: string, seen: Set<string>, max: number): EmoteItem[] {
  const found: EmoteItem[] = []
  for (const item of items) {
    if (found.length >= max) break
    if (seen.has(item.emoji) || !(item.haystack ?? haystackOf(item)).includes(q)) continue
    seen.add(item.emoji)
    found.push(item)
  }
  return found
}
