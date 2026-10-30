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
  /** Saiu, foi expulso, banido ou o servidor sumiu. */
  forget: (serverId: string) => void
  /**
   * As permissões mudaram: esquece e não aceita tela desse servidor até
   * markFresh (a tela aberta ainda é a de antes da mudança).
   */
  invalidate: (serverId: string) => void
  /** Chegou uma leitura nova do servidor: volta a aceitar a tela dele. */
  markFresh: (serverId: string) => void
  /** Saiu da conta: esquece tudo. */
  clear: () => void
}

const keyOf = (userId: string, serverId: string): string => `${userId}\u0000${serverId}`

/**
 * A última tela vista de cada servidor, para voltar a ele na hora (sem
 * "carregando") enquanto a versão nova chega por baixo. Por conta: a de uma
 * conta nunca aparece para outra. No máximo max telas (a usada há mais tempo
 * sai primeiro).
 *
 * Eventos de um servidor fechado (membro entrou, canal criado...) não
 * atualizam a tela guardada: ao voltar, ela aparece como estava e a releitura
 * acerta em seguida. A defasagem dura essa releitura; o que a pessoa deixou
 * de poder ver (permissões, expulsão) esquece a tela na hora.
 */
export function createServerViewCache(max = 30): ServerViewCache {
  const views = new Map<string, ServerView>()
  const dirty = new Set<string>()
  const forget = (serverId: string): void => {
    for (const key of [...views.keys()]) {
      if (key.endsWith(`\u0000${serverId}`)) views.delete(key)
    }
  }
  return {
    remember: (userId, view) => {
      if (!userId || dirty.has(view.server.id)) return
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
    forget,
    invalidate: (serverId) => {
      forget(serverId)
      dirty.add(serverId)
    },
    markFresh: (serverId) => {
      dirty.delete(serverId)
    },
    clear: () => {
      views.clear()
      dirty.clear()
    }
  }
}

/** O cache do app (um só, como os stores). */
export const serverViewCache = createServerViewCache()
