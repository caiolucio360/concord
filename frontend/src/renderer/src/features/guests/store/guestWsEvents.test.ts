import { beforeEach, describe, expect, it, vi } from 'vitest'

const { call, toast, servers } = vi.hoisted(() => ({
  call: { status: 'active', type: 'channel', serverId: 's' as string | null, endCall: vi.fn() },
  toast: { info: vi.fn(), error: vi.fn() },
  servers: { fetchServers: vi.fn(() => Promise.resolve()) }
}))
vi.mock('../../call/store/callStore', () => ({ useCallStore: { getState: () => call } }))
vi.mock('../../servers/store/serverStore', () => ({ useServerStore: { getState: () => servers } }))
vi.mock('../../../shared/store/toastStore', () => ({ showToast: toast }))

import { handleGuestWsEvent } from './guestWsEvents'
import { useGuestVisitsStore } from './guestVisitsStore'
import { useGuestSessionStore } from './guestSessionStore'
import { useGuestRosterStore } from './guestRosterStore'

const pass = {
  server_id: 's',
  server_name: 'BH RX',
  channel_id: 'c',
  channel_name: 'Sala',
  expires_at: '2099-01-01T00:00:00Z',
  can_speak: true,
  can_stream: false
}

describe('eventos de visitante no app', () => {
  beforeEach(() => {
    useGuestVisitsStore.getState().reset()
    useGuestSessionStore.getState().clear()
    call.endCall.mockClear()
    toast.info.mockClear()
    toast.error.mockClear()
    call.serverId = 's'
    servers.fetchServers.mockClear()
  })

  it('com conta: virar membro tira a visita sem sair da call e traz o servidor', () => {
    useGuestVisitsStore.getState().set([pass])
    handleGuestWsEvent({ type: 'guest:ended', payload: { server_id: 's', reason: 'member' } })
    expect(useGuestVisitsStore.getState().visits).toEqual([])
    expect(useGuestVisitsStore.getState().joined).toEqual({ s: 'c' })
    expect(call.endCall).not.toHaveBeenCalled()
    expect(toast.info).not.toHaveBeenCalled()
    expect(servers.fetchServers).toHaveBeenCalled()
  })

  it('guest:member tira o selo de visitante de quem virou membro', () => {
    useGuestRosterStore.getState().set(['u', 'v'])
    handleGuestWsEvent({ type: 'guest:member', payload: { call_id: 'c', server_id: 's', user_id: 'u' } })
    expect(useGuestRosterStore.getState().ids).toEqual(['v'])
  })

  it('com conta: entrar e mover atualizam a visita no trilho', () => {
    handleGuestWsEvent({ type: 'guest:pass', payload: pass })
    handleGuestWsEvent({ type: 'guest:pass', payload: { ...pass, channel_id: 'outra' } })
    expect(useGuestVisitsStore.getState().visits.map((v) => v.channel_id)).toEqual(['outra'])
  })

  it('com conta: o fim tira a visita, sai da call dela e avisa', () => {
    useGuestVisitsStore.getState().set([pass])
    handleGuestWsEvent({ type: 'guest:ended', payload: { server_id: 's', reason: 'expired' } })
    expect(useGuestVisitsStore.getState().visits).toEqual([])
    expect(call.endCall).toHaveBeenCalled()
    expect(toast.info).toHaveBeenCalledWith('Sua visita em BH RX terminou.')
    expect(useGuestSessionStore.getState().ended).toBeNull()
  })

  it('com conta: o fim de outra visita não derruba a call em que estou', () => {
    call.serverId = 'outro'
    useGuestVisitsStore.getState().set([pass])
    handleGuestWsEvent({ type: 'guest:ended', payload: { server_id: 's', reason: 'removed' } })
    expect(call.endCall).not.toHaveBeenCalled()
  })

  it('sem conta: o fim vai para a tela do visitante (e o canal novo também)', () => {
    useGuestSessionStore.getState().start('tok', pass)
    handleGuestWsEvent({ type: 'guest:pass', payload: { ...pass, channel_name: 'Outra' } })
    expect(useGuestSessionStore.getState().pass?.channel_name).toBe('Outra')
    handleGuestWsEvent({ type: 'guest:ended', payload: { server_id: 's', reason: 'revoked' } })
    expect(useGuestSessionStore.getState().ended).toBe('revoked')
    expect(toast.info).not.toHaveBeenCalled()
  })

  it('recusa vira aviso de erro, sem sair da call', () => {
    handleGuestWsEvent({ type: 'guest:refused', payload: { message: 'Não pode.' } })
    expect(toast.error).toHaveBeenCalledWith('Não pode.')
    expect(call.endCall).not.toHaveBeenCalled()
  })
})
