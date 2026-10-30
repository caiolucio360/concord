import type { WsEvent } from '../../../shared/api/ws'
import { showToast } from '../../../shared/store/toastStore'
import { useCallStore } from '../../call/store/callStore'
import { useServerStore } from '../../servers/store/serverStore'
import { guestEventAction, visitEndedMessage, type GuestEventAction } from '../lib/guestEvents'
import { useGuestSessionStore } from './guestSessionStore'
import { useGuestVisitsStore } from './guestVisitsStore'
import { useGuestRosterStore } from './guestRosterStore'

type Of<K extends GuestEventAction['kind']> = Extract<GuestEventAction, { kind: K }>

/**
 * Virei membro do servidor da visita: a visita sai do trilho, a call continua
 * (agora como membro) e a lista de servidores traz o ícone normal (nos outros
 * apps da conta também).
 */
function becameMember(serverId: string): void {
  useGuestVisitsStore.getState().becameMember(serverId)
  void useServerStore.getState().fetchServers()
}

/** A visita (de quem tem conta) acabou: some do trilho, sai da call dela e avisa. */
function endVisit({ serverId, reason }: Of<'ended'>): void {
  if (reason === 'member') {
    becameMember(serverId)
    return
  }
  const visits = useGuestVisitsStore.getState()
  const visit = visits.visits.find((v) => v.server_id === serverId) ?? null
  visits.remove(serverId)
  const call = useCallStore.getState()
  if (call.status !== 'idle' && call.type === 'channel' && call.serverId === serverId) {
    call.endCall()
  }
  showToast.info(visitEndedMessage(visit?.server_name ?? null, reason))
}

const APPLY: { [K in GuestEventAction['kind']]: (action: Of<K>) => void } = {
  pass: ({ pass }) => {
    useGuestVisitsStore.getState().upsert(pass)
    const session = useGuestSessionStore.getState()
    if (session.anonymous && session.pass?.server_id === pass.server_id) session.setPass(pass)
  },
  ended: (action) => {
    // Sem conta: a tela do visitante mostra o fim; com conta, o trilho.
    if (useGuestSessionStore.getState().anonymous) {
      useGuestSessionStore.getState().end(action.reason)
      return
    }
    endVisit(action)
  },
  refused: ({ message }) => showToast.error(message),
  member: ({ userId }) => {
    const roster = useGuestRosterStore.getState()
    roster.set(roster.ids.filter((id) => id !== userId))
  }
}

/** Eventos guest:* do WebSocket. */
export function handleGuestWsEvent(event: WsEvent): void {
  const action = guestEventAction(event)
  if (action) (APPLY[action.kind] as (a: GuestEventAction) => void)(action)
}
