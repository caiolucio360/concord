import { useAuthStore } from '../../auth/store/authStore'
import { fetchMediaToken } from '../api/attachments'
import { ensureMediaToken, invalidateMediaToken, needsNewMediaToken } from './mediaToken'

jest.mock('../api/attachments', () => ({ fetchMediaToken: jest.fn() }))

const future = (min: number) => new Date(Date.now() + min * 60_000).toISOString()

describe('token de mídia', () => {
  beforeEach(() => {
    jest.mocked(fetchMediaToken).mockReset()
    invalidateMediaToken()
    useAuthStore.setState({ accessToken: 'a1' } as never)
  })

  it('needsNewMediaToken: sem cache, login trocado ou perto de vencer', () => {
    const c = { token: 't', expiresAt: 1_000_000, accessToken: 'a1' }
    expect(needsNewMediaToken(null, 'a1', 0)).toBe(true)
    expect(needsNewMediaToken(c, 'a2', 0)).toBe(true)
    expect(needsNewMediaToken(c, 'a1', 1_000_000 - 9 * 60_000)).toBe(true)
    expect(needsNewMediaToken(c, 'a1', 0)).toBe(false)
  })

  it('pede uma vez, divide entre quem pede junto e reaproveita', async () => {
    jest.mocked(fetchMediaToken).mockResolvedValue({ token: 'tk', expires_at: future(60) })
    const [a, b] = await Promise.all([ensureMediaToken(), ensureMediaToken()])
    expect([a, b]).toEqual(['tk', 'tk'])
    expect(await ensureMediaToken()).toBe('tk')
    expect(fetchMediaToken).toHaveBeenCalledTimes(1)
  })

  it('invalidate com token velho não derruba o novo; sem argumento descarta', async () => {
    jest.mocked(fetchMediaToken).mockResolvedValue({ token: 'tk', expires_at: future(60) })
    await ensureMediaToken()
    invalidateMediaToken('outro')
    await ensureMediaToken()
    expect(fetchMediaToken).toHaveBeenCalledTimes(1)
    invalidateMediaToken('tk')
    await ensureMediaToken()
    expect(fetchMediaToken).toHaveBeenCalledTimes(2)
  })
})
