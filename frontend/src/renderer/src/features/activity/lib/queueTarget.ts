// Onde "Adicionar à fila do Maestro" vale: na call de canal de voz de um
// servidor em que estou. Puro; o resto (Maestro ligado, permissões) o servidor
// confere e devolve o motivo.

export const QUEUE_NEEDS_CALL = 'Entre numa call de servidor para usar o Maestro.'

export interface CallSnapshot {
  status: string
  type: string | null
  serverId: string | null
}

export type QueueTarget = { serverId: string } | { reason: string }

export function queueTarget(call: CallSnapshot): QueueTarget {
  if (call.status === 'active' && call.type === 'channel' && call.serverId) {
    return { serverId: call.serverId }
  }
  return { reason: QUEUE_NEEDS_CALL }
}
