
const mockFetchRanking = jest.fn()
jest.mock('../api/ranking', () => ({ fetchRanking: (...a: unknown[]) => mockFetchRanking(...a) }))

import { useRankingStore } from './rankingStore'

beforeEach(() => {
  mockFetchRanking.mockReset()
  useRankingStore.setState({ ranking: null, loading: false, error: null })
})

describe('rankingStore', () => {
  it('carrega o ranking', async () => {
    mockFetchRanking.mockResolvedValue({ entries: [], me: { position: 3, level: 5, xp: 10 } })
    const p = useRankingStore.getState().fetch()
    expect(useRankingStore.getState().loading).toBe(true)
    await p
    const s = useRankingStore.getState()
    expect(s.loading).toBe(false)
    expect(s.error).toBeNull()
    expect(s.ranking?.me?.position).toBe(3)
  })

  it('erro vira mensagem e não apaga o ranking anterior', async () => {
    const previous = { entries: [], me: null }
    useRankingStore.setState({ ranking: previous })
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockFetchRanking.mockRejectedValue(new Error('rede'))
    await useRankingStore.getState().fetch()
    const s = useRankingStore.getState()
    expect(s.error).toBe('Não foi possível carregar o ranking.')
    expect(s.ranking).toBe(previous)
    expect(s.loading).toBe(false)
  })

  it('recarregar com dados antigos não volta ao skeleton', async () => {
    useRankingStore.setState({ ranking: { entries: [], me: null } })
    mockFetchRanking.mockResolvedValue({ entries: [], me: null })
    const p = useRankingStore.getState().fetch()
    expect(useRankingStore.getState().loading).toBe(false)
    await p
  })
})
