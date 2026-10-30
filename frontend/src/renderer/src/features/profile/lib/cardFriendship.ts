import type { RelationshipType } from '../../friends/api/friends'
import { friendRequestError } from './relationship'

/** Botão de amizade do cartão: o texto e o estado pela relação comigo. */
export interface FriendButton {
  label: string
  /** Pedido que chegou: o botão aceita (verde). */
  incoming: boolean
  /** Pedido já enviado: o botão fica desabilitado. */
  pending: boolean
}

/** Sem o @, já amigos ou bloqueado: sem botão. */
export function friendButtonOf(
  relationship: RelationshipType,
  hasUsername: boolean
): FriendButton | null {
  if (!hasUsername || relationship === 'friend' || relationship === 'blocked') return null
  const labels: Record<string, string> = {
    outgoing: 'Pedido enviado',
    incoming: 'Aceitar pedido'
  }
  return {
    label: labels[relationship] ?? 'Adicionar amigo',
    incoming: relationship === 'incoming',
    pending: relationship === 'outgoing'
  }
}

export interface FriendNotice {
  kind: 'success' | 'error'
  message: string
}

interface FriendActions {
  accept: (username: string) => Promise<void>
  sendRequest: (username: string) => Promise<string>
}

/**
 * Aceita o pedido que chegou ou manda um novo. Devolve o aviso a mostrar
 * (nenhum ao aceitar: a lista de amigos já muda na tela).
 */
export async function befriend(
  relationship: RelationshipType,
  username: string,
  displayName: string,
  actions: FriendActions
): Promise<FriendNotice | null> {
  try {
    if (relationship === 'incoming') {
      await actions.accept(username)
      return null
    }
    const result = await actions.sendRequest(username)
    const message =
      result === 'accepted'
        ? `Você e ${displayName} agora são amigos.`
        : `Pedido de amizade enviado para ${displayName}.`
    return { kind: 'success', message }
  } catch (err) {
    return { kind: 'error', message: friendRequestError(err) }
  }
}
