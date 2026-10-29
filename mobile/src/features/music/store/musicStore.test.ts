import { getMusicPresence, getMusicState } from '../api/music'
import { useMusicStore } from './musicStore'

jest.mock('../api/music', () => ({ getMusicState: jest.fn(), getMusicPresence: jest.fn() }))

const state = { call_id: 'c1', channel_id: 'v1', server_id: 's1', server_time: Date.now() + 1000, now: null, queue: [], skip: { votes: 0, needed: 1, voters: [] } }
const store = () => useMusicStore.getState()
const emit = (type: string, payload: unknown) => store().handleWsEvent({ type, payload })

describe('musicStore', () => {
  beforeEach(() => {
    useMusicStore.setState({ state: null, ephemeral: [], presence: {}, serverOffsetMs: 0, panelOpen: false })
    jest.clearAllMocks()
  })

  it('guarda o estado e o desvio do relógio do servidor', () => {
    emit('music:state', state)
    expect(store().state?.call_id).toBe('c1')
    expect(store().serverOffsetMs).toBeGreaterThan(500)
  })

  it('closed limpa só o estado da mesma call (e fecha o painel)', () => {
    emit('music:state', state)
    store().openPanel()
    emit('music:state', { ...state, call_id: 'outra', closed: true })
    expect(store().state?.call_id).toBe('c1')
    emit('music:state', { ...state, closed: true })
    expect(store().state).toBeNull()
    expect(store().panelOpen).toBe(false)
  })

  it('respostas e buscas viram mensagens efêmeras da sala certa; dispensar e expirar', () => {
    emit('music:reply', { channel_id: 't1', text: 'oi' })
    emit('music:search', { token: 'tk', channel_id: 't1', query: 'lofi', expires_at: 1, results: [] })
    const eph = store().ephemeral
    expect(eph.map((e) => [e.room, e.kind])).toEqual([
      ['channel:t1', 'text'],
      ['channel:t1', 'search']
    ])
    store().dismiss(eph[0].id)
    expect(store().ephemeral).toHaveLength(1)
    store().markExpired(eph[1].id)
    expect(store().ephemeral[0].expired).toBe(true)
  })

  it('presença por servidor liga e desliga canais', () => {
    emit('music:presence', { server_id: 's1', channel_id: 'v1', active: true })
    emit('music:presence', { server_id: 's1', channel_id: 'v2', active: true })
    emit('music:presence', { server_id: 's1', channel_id: 'v1', active: false })
    expect(store().presence.s1).toEqual(['v2'])
  })

  it('evento desconhecido é ignorado', () => {
    emit('music:outro', {})
    expect(store().ephemeral).toEqual([])
  })

  it('loadState guarda ou limpa; loadPresence guarda os canais', async () => {
    jest.mocked(getMusicState).mockResolvedValueOnce(state)
    await store().loadState('s1')
    expect(store().state?.call_id).toBe('c1')
    jest.mocked(getMusicState).mockResolvedValueOnce(null)
    await store().loadState('s1')
    expect(store().state).toBeNull()
    jest.mocked(getMusicPresence).mockResolvedValueOnce(['v9'])
    await store().loadPresence('s1')
    expect(store().presence.s1).toEqual(['v9'])
    store().openPanel()
    store().clearState()
    expect(store().panelOpen).toBe(false)
  })
})
