import type { Server, ServerMember } from '../api/servers'
import type { Channel } from '../api/channels'
import type { Role } from './permissions'

/** O que a tela de um servidor mostra: servidor, membros, cargos e canais. */
export interface ServerView {
  server: Server
  members: ServerMember[]
  roles: Role[]
  channels: Channel[]
}

export interface ServerViewCache {
  remember: (userId: string | null | undefined, view: ServerView) => void
  recall: (userId: string | null | undefined, serverId: string) => ServerView | null
  /** Saiu, foi expulso, banido, o servidor sumiu ou as permissões mudaram. */
  forget: (serverId: string) => void
}

const keyOf = (userId: string, serverId: string): string => `${userId}\u0000${serverId}`

/**
 * A última tela vista de cada servidor, para voltar a ele na hora (sem
 * "carregando") enquanto a versão nova chega por baixo. Por conta: a de uma
 * conta nunca aparece para outra. No máximo max telas (a usada há mais tempo
 * sai primeiro).
 */
export function createServerViewCache(max = 30): ServerViewCache {
  const views = new Map<string, ServerView>()
  return {
    remember: (userId, view) => {
      if (!userId) return
      const key = keyOf(userId, view.server.id)
      views.delete(key)
      views.set(key, view)
      if (views.size > max) views.delete(views.keys().next().value as string)
    },
    recall: (userId, serverId) => {
      if (!userId) return null
      const key = keyOf(userId, serverId)
      const view = views.get(key)
      if (!view) return null
      views.delete(key) // reinsere: vira a usada mais recentemente
      views.set(key, view)
      return view
    },
    forget: (serverId) => {
      for (const key of [...views.keys()]) {
        if (key.endsWith(`\u0000${serverId}`)) views.delete(key)
      }
    }
  }
}

/** O cache do app (um só, como os stores). */
export const serverViewCache = createServerViewCache()
