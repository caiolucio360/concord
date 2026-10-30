import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GetServerResponse, Server, ServerMember } from '../api/servers'
import type { Channel } from '../api/channels'

// Voltar a um servidor já visto mostra a última tela na hora (sem o
// "carregando" de tela cheia) e atualiza por baixo.

const getServer = vi.fn()
vi.mock('../api/servers', () => ({ getServer: (...args: unknown[]) => getServer(...args) }))
vi.mock('../api/invites', () => ({}))
const listChannels = vi.fn()
vi.mock('../api/channels', () => ({ listChannels: (...args: unknown[]) => listChannels(...args) }))
vi.mock('../api/roles', () => ({}))
const auth = vi.hoisted(() => ({ userId: 'ana' }))
vi.mock('../../auth/store/authStore', () => ({
  useAuthStore: { getState: () => ({ accessToken: 't', user: { id: auth.userId } }) }
}))

const { useServerStore } = await import('./serverStore')

const server = (id: string): Server => ({ id, name: id, owner_id: 'ana' })
const member = (userId: string, serverId: string): ServerMember => ({
  server_id: serverId,
  user_id: userId,
  role: 'member'
})
const response = (id: string, users: string[]): GetServerResponse => ({
  server: server(id),
  members: users.map((u) => member(u, id)),
  roles: []
})

/** Abre id com a resposta dada e os canais já carregados. */
async function open(id: string, users: string[]): Promise<void> {
  getServer.mockResolvedValueOnce(response(id, users))
  await useServerStore.getState().selectServer(id)
  useServerStore.setState({
    channels: [{ id: `c-${id}`, server_id: id, name: 'geral', type: 'text', created_by: 'ana', created_at: '', updated_at: '' }],
    channelsLoadedFor: id
  })
}

/** Grava se o store passou pelo "carregando". */
function watchLoading(): { loading: boolean[]; stop: () => void } {
  const loading: boolean[] = []
  const stop = useServerStore.subscribe((s) => loading.push(s.loading))
  return { loading, stop }
}

beforeEach(() => {
  getServer.mockReset()
  listChannels.mockReset()
  auth.userId = 'ana'
  useServerStore.getState().reset()
})

describe('voltar a um servidor já visto', () => {
  it('mostra a última tela na hora e atualiza por baixo', async () => {
    await open('s1', ['ana', 'bia'])
    await open('s2', ['ana'])

    let resolveFresh: (v: unknown) => void = () => {}
    getServer.mockReturnValueOnce(new Promise((r) => (resolveFresh = r)))
    const watch = watchLoading()
    const back = useServerStore.getState().selectServer('s1')

    // Antes da resposta: já é o s1, com membros e canais da última vez.
    const now = useServerStore.getState()
    expect(now.currentServer?.id).toBe('s1')
    expect(now.currentMembers.map((m) => m.user_id)).toEqual(['ana', 'bia'])
    expect(now.channelsLoadedFor).toBe('s1')
    expect(now.channels.map((c) => c.id)).toEqual(['c-s1'])

    resolveFresh(response('s1', ['ana', 'bia', 'caio']))
    await back
    watch.stop()
    expect(watch.loading).not.toContain(true)
    expect(useServerStore.getState().currentMembers.map((m) => m.user_id)).toEqual(['ana', 'bia', 'caio'])
  })

  it('outra conta não vê a tela guardada', async () => {
    await open('s1', ['ana'])
    await open('s2', ['ana'])

    auth.userId = 'bia'
    getServer.mockResolvedValueOnce(response('s1', ['bia']))
    const watch = watchLoading()
    await useServerStore.getState().selectServer('s1')
    watch.stop()

    expect(watch.loading).toContain(true)
  })

  it('servidor removido (saiu, expulso, banido) sai do cache', async () => {
    await open('s1', ['ana'])
    await open('s2', ['ana'])
    useServerStore.getState().removeLocalServer('s1')

    getServer.mockResolvedValueOnce(response('s1', ['ana']))
    const watch = watchLoading()
    await useServerStore.getState().selectServer('s1')
    watch.stop()

    expect(watch.loading).toContain(true)
  })
})

describe('refreshServer', () => {
  const channel = (id: string, serverId: string): Channel => ({
    id,
    server_id: serverId,
    name: id,
    type: 'text',
    created_by: 'ana',
    created_at: '',
    updated_at: ''
  })

  it('relê servidor, membros e canais do servidor aberto', async () => {
    await open('s1', ['ana'])
    getServer.mockResolvedValueOnce(response('s1', ['ana', 'bia']))
    listChannels.mockResolvedValueOnce([channel('c1', 's1'), channel('c2', 's1')])

    await useServerStore.getState().refreshServer('s1')

    const s = useServerStore.getState()
    expect(s.currentMembers.map((m) => m.user_id)).toEqual(['ana', 'bia'])
    expect(s.channels.map((c) => c.id)).toEqual(['c1', 'c2'])
    expect(s.channelsLoadedFor).toBe('s1')
    expect(s.nicknames.s1).toEqual({})
  })

  it('a resposta de um servidor que já não está aberto é ignorada', async () => {
    await open('s1', ['ana'])
    getServer.mockResolvedValueOnce(response('s2', ['caio']))
    listChannels.mockResolvedValueOnce([channel('x', 's2')])

    await useServerStore.getState().refreshServer('s2')

    expect(useServerStore.getState().currentServer?.id).toBe('s1')
    expect(useServerStore.getState().currentMembers.map((m) => m.user_id)).toEqual(['ana'])
  })

  it('erro (expulso, rede fora) não apaga a tela', async () => {
    await open('s1', ['ana'])
    getServer.mockRejectedValueOnce(new Error('403'))
    listChannels.mockResolvedValueOnce([])

    await useServerStore.getState().refreshServer('s1')

    expect(useServerStore.getState().currentServer?.id).toBe('s1')
  })

  it('canais que não vêm em lista viram lista vazia', async () => {
    await open('s1', ['ana'])
    getServer.mockResolvedValueOnce(response('s1', ['ana']))
    listChannels.mockResolvedValueOnce(null)

    await useServerStore.getState().refreshServer('s1')

    expect(useServerStore.getState().channels).toEqual([])
  })
})
