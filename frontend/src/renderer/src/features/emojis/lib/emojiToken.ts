// Emojis personalizados no texto e nas reações (docs/adr/0028-emojis-personalizados.md):
// no texto vão como <:nome:id>; na reação, como <:id> (cabe no limite da coluna).

const NAME = '[A-Za-z0-9_]{2,32}'
const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'

const NAME_RE = new RegExp(`^${NAME}$`)
const REACTION_RE = new RegExp(`^<:(${UUID})>$`)

export interface CustomEmojiRef {
  id: string
  name: string
}

/** Pedaço do texto: texto puro ou um emoji personalizado. */
export interface EmojiPart {
  text: string
  emoji?: CustomEmojiRef
}

export function isValidEmojiName(name: string): boolean {
  return NAME_RE.test(name)
}

export function messageToken(emoji: CustomEmojiRef): string {
  return `<:${emoji.name}:${emoji.id}>`
}

export function reactionToken(id: string): string {
  return `<:${id}>`
}

/** Id do emoji personalizado de uma reação, ou null se é um emoji comum. */
export function reactionEmojiId(emoji: string): string | null {
  return REACTION_RE.exec(emoji)?.[1] ?? null
}

/**
 * Separa os <:nome:id> do resto do texto. Roda a cada render de mensagem:
 * sem "<:" não faz nada; com, é um regex global só (linear no texto).
 */
export function splitCustomEmojis(text: string): EmojiPart[] {
  if (!text.includes('<:')) return [{ text }]
  const parts: EmojiPart[] = []
  const re = new RegExp(`<:(${NAME}):(${UUID})>`, 'g')
  let last = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) })
    parts.push({ text: m[0], emoji: { name: m[1], id: m[2] } })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

/** Mais que isso numa mensagem só de emojis e eles voltam ao tamanho normal. */
const MAX_JUMBO = 27

/** Mensagem só com emojis personalizados (e espaços): mostra grandes. */
export function isEmojiOnly(parts: { text: string; emoji?: unknown }[]): boolean {
  let count = 0
  for (const part of parts) {
    if (part.emoji) count++
    else if (part.text.trim()) return false
  }
  return count > 0 && count <= MAX_JUMBO
}
