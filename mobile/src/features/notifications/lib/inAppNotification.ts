import type { Message } from '../../chat/api/messages'
import type { ActiveRoom } from '../../chat/lib/unreadCounts'

export interface InAppNotification {
  title: string
  body: string
  /** Mesmo formato do `data` do push (notificationRoute): o toque abre a conversa ou o canal. */
  data: Record<string, unknown>
}

const MAX_BODY = 140
const NO_TEXT = 'Enviou um anexo'
// Mesma regra de token do push (backend/internal/push/mentions.go): o "@" abre a palavra (não vale em e-mail).
const MENTION = /(?:^|[\s(\[{,;:!?"'])@([a-z0-9_]{3,32})\b/gi

/** O texto cita a pessoa (@usuário) ou todo mundo (@all), como o push decide. */
function mentions(content: string, username: string): boolean {
  const me = username.toLowerCase()
  for (const m of content.matchAll(MENTION)) {
    const name = m[1].toLowerCase()
    if (name === me || name === 'all') return true
  }
  return false
}

const bodyOf = (content: string): string => (content.trim() === '' ? NO_TEXT : content.slice(0, MAX_BODY))

/**
 * Com o app aberto o servidor não manda push (ele só vai para o celular com o app fechado): o próprio app avisa
 * de DM e de menção, como o Discord, fora da conversa que está aberta na tela. Devolve null quando não avisa.
 */
export function inAppNotificationFor(
  payload: { message?: Message; server_id?: string },
  me: { id: string; username: string },
  active: ActiveRoom | null
): InAppNotification | null {
  const message = payload.message
  if (!message || message.author_id === me.id || message.system_kind) return null
  const title = message.author?.display_name || message.author?.username || 'Mensagem'
  if (message.conversation_id) {
    if (active?.kind === 'conversation' && active.id === message.conversation_id) return null
    return { title, body: bodyOf(message.content), data: { type: 'dm', conversation_id: message.conversation_id, name: title, in_app: true } }
  }
  if (!message.channel_id || !mentions(message.content, me.username)) return null
  if (active?.kind === 'channel' && active.id === message.channel_id) return null
  return {
    title,
    body: bodyOf(message.content),
    data: { type: 'mention', channel_id: message.channel_id, server_id: payload.server_id ?? '', name: '', in_app: true }
  }
}
