import { useAuthStore } from '../../auth/store/authStore'
import { fetchBadges } from '../api/badges'
import { fetchLevels, fetchMyLevel } from '../api/levels'
import { useBadgeStore } from './badgeStore'
import { useLevelStore } from './levelStore'

jest.mock('../api/levels', () => ({ fetchLevels: jest.fn(), fetchMyLevel: jest.fn() }))
jest.mock('../api/badges', () => ({ fetchBadges: jest.fn() }))

const progress = (id: string, level: number) => ({ user_id: id, level, xp: 0, xp_into_level: 0, xp_for_next: 1, voice_seconds: 0 })

describe('levelStore', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    useLevelStore.getState().reset()
    useAuthStore.setState({ accessToken: 't' } as never)
  })
  afterEach(() => jest.useRealTimers())

  it('junta os pedidos em um só request e guarda o nível', async () => {
    jest.mocked(fetchLevels).mockResolvedValue({ a: progress('a', 5), b: progress('b', 12) })
    useLevelStore.getState().ensureLevels(['a'])
    useLevelStore.getState().ensureLevels(['b', 'a', ''])
    await jest.advanceTimersByTimeAsync(40)
    expect(fetchLevels).toHaveBeenCalledTimes(1)
    expect(fetchLevels).toHaveBeenCalledWith(['a', 'b'])
    expect(useLevelStore.getState().levels).toEqual({ a: 5, b: 12 })
    useLevelStore.getState().ensureLevels(['a'])
    await jest.advanceTimersByTimeAsync(40)
    expect(fetchLevels).toHaveBeenCalledTimes(1)
  })

  it('falha libera para tentar de novo; troca de login descarta a resposta', async () => {
    jest.mocked(fetchLevels).mockRejectedValueOnce(new Error('x'))
    useLevelStore.getState().ensureLevels(['a'])
    await jest.advanceTimersByTimeAsync(40)
    jest.mocked(fetchLevels).mockImplementationOnce(async () => {
      useAuthStore.setState({ accessToken: 'outro' } as never)
      return { a: progress('a', 9) }
    })
    useLevelStore.getState().ensureLevels(['a'])
    await jest.advanceTimersByTimeAsync(40)
    expect(fetchLevels).toHaveBeenCalledTimes(2)
    expect(useLevelStore.getState().levels).toEqual({})
  })

  it('loadMe guarda o progresso e o nível; reset limpa', async () => {
    jest.mocked(fetchMyLevel).mockResolvedValue(progress('me', 30))
    await useLevelStore.getState().loadMe()
    expect(useLevelStore.getState().me?.level).toBe(30)
    expect(useLevelStore.getState().levels.me).toBe(30)
    useLevelStore.getState().reset()
    expect(useLevelStore.getState().me).toBeNull()
  })
})

describe('badgeStore', () => {
  const res = { user_id: 'u1', self: false, badges: [{ category: 'amigos', tier: 1 }], hidden_remaining: 3 }
  beforeEach(() => {
    jest.clearAllMocks()
    useBadgeStore.getState().reset()
    useAuthStore.setState({ accessToken: 't' } as never)
  })

  it('busca uma vez, guarda e reaproveita dentro de 1 minuto; force busca de novo', async () => {
    jest.mocked(fetchBadges).mockResolvedValue(res as never)
    await Promise.all([useBadgeStore.getState().ensureBadges('u1'), useBadgeStore.getState().ensureBadges('u1')])
    await useBadgeStore.getState().ensureBadges('u1')
    expect(fetchBadges).toHaveBeenCalledTimes(1)
    expect(useBadgeStore.getState().byUser.u1).toMatchObject({ hiddenRemaining: 3, badges: [{ category: 'amigos' }] })
    await useBadgeStore.getState().ensureBadges('u1', true)
    expect(fetchBadges).toHaveBeenCalledTimes(2)
  })

  it('erro não guarda nada e não quebra; sem id não faz nada', async () => {
    jest.mocked(fetchBadges).mockRejectedValue(new Error('x'))
    await useBadgeStore.getState().ensureBadges('u1')
    await useBadgeStore.getState().ensureBadges('')
    expect(useBadgeStore.getState().byUser).toEqual({})
  })

  it('login trocado no meio descarta a resposta; modal abre e fecha', async () => {
    jest.mocked(fetchBadges).mockImplementation(async () => {
      useAuthStore.setState({ accessToken: 'outro' } as never)
      return res as never
    })
    await useBadgeStore.getState().ensureBadges('u1')
    expect(useBadgeStore.getState().byUser).toEqual({})
    useBadgeStore.getState().openModal({ userId: 'u1', name: 'Ana', category: 'amigos' })
    expect(useBadgeStore.getState().modal?.category).toBe('amigos')
    useBadgeStore.getState().closeModal()
    expect(useBadgeStore.getState().modal).toBeNull()
  })
})
