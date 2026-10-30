import { beforeEach, describe, expect, it, vi } from 'vitest'

const token = vi.hoisted(() => ({ ensure: vi.fn() }))
vi.mock('../../chat/store/mediaToken', () => ({ ensureMediaToken: token.ensure }))
vi.mock('../../../shared/lib/config', () => ({ API_BASE_URL: 'https://api' }))

import { cachedEmojiSrc, clearEmojiSrcs, loadEmojiSrc, subscribeEmojiSrc } from './emojiSrc'

describe('emojiSrc', () => {
  beforeEach(() => {
    clearEmojiSrcs()
    token.ensure.mockReset()
  })

  it('monta a URL uma vez por sessão, mesmo com o token renovado depois', async () => {
    token.ensure.mockResolvedValueOnce('t1').mockResolvedValueOnce('t2')
    const first = await loadEmojiSrc('e1')
    expect(first).toBe('https://api/emojis/e1/file?token=t1')
    expect(await loadEmojiSrc('e1')).toBe(first)
    expect(token.ensure).toHaveBeenCalledTimes(1)
  })

  it('duas cargas ao mesmo tempo ficam com a mesma URL', async () => {
    token.ensure.mockResolvedValueOnce('t1').mockResolvedValueOnce('t2')
    const [a, b] = await Promise.all([loadEmojiSrc('e1'), loadEmojiSrc('e1')])
    expect(a).toBe(b)
    expect(cachedEmojiSrc('e1')).toBe(a)
  })

  it('subscribe: desligado não faz nada; com cache entrega na hora', () => {
    const onSrc = vi.fn()
    subscribeEmojiSrc('e1', false, onSrc)()
    expect(token.ensure).not.toHaveBeenCalled()
    expect(onSrc).not.toHaveBeenCalled()
  })

  it('subscribe: entrega quando chega e não entrega depois de cancelar', async () => {
    token.ensure.mockResolvedValue('t1')
    const onSrc = vi.fn()
    subscribeEmojiSrc('e1', true, onSrc)
    await vi.waitFor(() => expect(onSrc).toHaveBeenCalledWith('https://api/emojis/e1/file?token=t1'))

    subscribeEmojiSrc('e1', true, onSrc)
    expect(onSrc).toHaveBeenCalledTimes(2) // do cache, na hora

    const late = vi.fn()
    subscribeEmojiSrc('e2', true, late)()
    await Promise.resolve()
    await Promise.resolve()
    expect(late).not.toHaveBeenCalled()
  })

  it('subscribe: falha do token não quebra', async () => {
    token.ensure.mockRejectedValue(new Error('rede'))
    const onSrc = vi.fn()
    subscribeEmojiSrc('e3', true, onSrc)
    await Promise.resolve()
    expect(onSrc).not.toHaveBeenCalled()
  })
})
