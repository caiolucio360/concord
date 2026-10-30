import { describe, expect, it } from 'vitest'
import {
  liveVisits,
  removeVisit,
  upsertVisit,
  visitOf,
  visitPageTarget,
  visitPath,
  visitServerOf,
  visitsOutsideServers
} from './guestVisits'

const NOW = Date.parse('2026-10-28T12:00:00Z')
type Visit = { server_id: string; channel_id: string; expires_at: string }
function pass(server: string, over: Record<string, unknown> = {}): Visit {
  const visit = {
    server_id: server,
    server_name: `Servidor ${server}`,
    channel_id: `voz-${server}`,
    channel_name: 'Sala',
    expires_at: '2026-10-28T14:00:00Z',
    can_speak: true,
    can_stream: false,
    ...over
  }
  return visit as Visit
}

describe('visitas de quem tem conta (trilho)', () => {
  it('caminho da visita e o servidor a partir do caminho', () => {
    expect(visitPath('abc')).toBe('/visitas/abc')
    expect(visitServerOf('/visitas/abc')).toBe('abc')
    expect(visitServerOf('/servers/abc')).toBeNull()
    expect(visitServerOf('/visitas/')).toBeNull()
  })

  it('upsert troca a visita do mesmo servidor (mover de canal) e acrescenta as novas', () => {
    const list = upsertVisit([pass('a')], pass('b'))
    expect(list.map((v) => v.server_id)).toEqual(['a', 'b'])
    const moved = upsertVisit(list, pass('a', { channel_id: 'outra' }))
    expect(moved.map((v) => v.channel_id)).toEqual(['outra', 'voz-b'])
  })

  it('remove some com a visita do servidor', () => {
    expect(removeVisit([pass('a'), pass('b')], 'a').map((v) => v.server_id)).toEqual(['b'])
  })

  it('só as que não venceram aparecem', () => {
    const list = [pass('a'), pass('b', { expires_at: '2026-10-28T11:59:00Z' })]
    expect(liveVisits(list, NOW).map((v) => v.server_id)).toEqual(['a'])
    expect(visitOf(list, 'a', NOW)?.server_id).toBe('a')
    expect(visitOf(list, 'b', NOW)).toBeNull()
    expect(visitOf(list, undefined, NOW)).toBeNull()
  })
})

describe('quem virou membro (sem visita duplicada)', () => {
  it('o trilho não mostra a visita de servidor de que já sou membro', () => {
    const list = [pass('a'), pass('b')]
    expect(visitsOutsideServers(list, ['b', 'z']).map((v) => v.server_id)).toEqual(['a'])
  })

  it('/visitas/<servidor> de quem é membro vai para o canal no servidor', () => {
    expect(
      visitPageTarget({ serverId: 'a', member: true, visit: pass('a'), loaded: true })
    ).toEqual({ kind: 'go', path: '/servers/a/channels/voz-a' })
    expect(visitPageTarget({ serverId: 'a', member: true, visit: null, loaded: true })).toEqual({
      kind: 'go',
      path: '/servers/a'
    })
  })

  it('virou membro agora: vai para o canal da call, mesmo antes da lista de servidores', () => {
    expect(
      visitPageTarget({ serverId: 'a', member: false, visit: null, loaded: true, joinedChannel: 'voz-a' })
    ).toEqual({ kind: 'go', path: '/servers/a/channels/voz-a' })
  })

  it('visitante: abre a visita; sem visita, espera a lista ou volta ao Início', () => {
    expect(visitPageTarget({ serverId: 'a', member: false, visit: pass('a'), loaded: true })).toEqual({
      kind: 'visit'
    })
    expect(visitPageTarget({ serverId: 'a', member: false, visit: null, loaded: false })).toEqual({
      kind: 'wait'
    })
    expect(visitPageTarget({ serverId: 'a', member: false, visit: null, loaded: true })).toEqual({
      kind: 'go',
      path: '/friends'
    })
  })
})
