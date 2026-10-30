import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ token: 'tok' as string | null, refresh: vi.fn() }))
vi.mock('../../../shared/lib/config', () => ({ API_BASE_URL: 'https://api' }))
vi.mock('../../auth/store/authStore', () => ({
  useAuthStore: { getState: () => ({ accessToken: auth.token }) }
}))
vi.mock('../../../shared/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/api/client')>()),
  refreshTokens: auth.refresh
}))

import { ApiError } from '../../../shared/api/client'
import { emojiFileUrl, uploadServerEmoji } from './emojis'

const reply = (status: number, body: unknown): Response =>
  ({ ok: status < 300, status, json: () => Promise.resolve(body) }) as Response

describe('api de emojis', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    auth.token = 'tok'
    auth.refresh.mockReset()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('URL do arquivo leva o media token', () => {
    expect(emojiFileUrl('e 1', 't&x')).toBe('https://api/emojis/e%201/file?token=t%26x')
  })

  it('envia nome e arquivo com o Bearer', async () => {
    fetchMock.mockResolvedValueOnce(reply(201, { id: 'e1', name: 'festa' }))
    const created = await uploadServerEmoji('s1', 'festa', new Blob(['x']))
    expect(created).toMatchObject({ id: 'e1' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api/servers/s1/emojis')
    expect(init.headers).toEqual({ Authorization: 'Bearer tok' })
    expect((init.body as FormData).get('name')).toBe('festa')
  })

  it('erro do servidor vira ApiError com a mensagem dele', async () => {
    fetchMock.mockResolvedValueOnce(reply(409, { error: 'Este servidor já tem 50 emojis.' }))
    await expect(uploadServerEmoji('s1', 'festa', new Blob())).rejects.toMatchObject({
      status: 409,
      message: 'Este servidor já tem 50 emojis.'
    })
  })

  it('401 renova a sessão e tenta de novo uma vez', async () => {
    fetchMock.mockResolvedValueOnce(reply(401, {})).mockResolvedValueOnce(reply(201, { id: 'e2' }))
    auth.refresh.mockResolvedValueOnce(true)
    expect(await uploadServerEmoji('s1', 'festa', new Blob())).toMatchObject({ id: 'e2' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('401 sem renovar, ou sem login, devolve o erro', async () => {
    fetchMock.mockResolvedValue(reply(401, {}))
    auth.refresh.mockResolvedValueOnce(false)
    await expect(uploadServerEmoji('s1', 'festa', new Blob())).rejects.toBeInstanceOf(ApiError)
    auth.token = null
    await expect(uploadServerEmoji('s1', 'festa', new Blob())).rejects.toMatchObject({ status: 401 })
    expect(fetchMock.mock.calls[1][1].headers).toBeUndefined()
  })

  it('corpo que não é JSON não quebra', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 502, json: () => Promise.reject(new Error('html')) })
    await expect(uploadServerEmoji('s1', 'festa', new Blob())).rejects.toMatchObject({
      message: 'Upload failed: 502'
    })
  })
})
