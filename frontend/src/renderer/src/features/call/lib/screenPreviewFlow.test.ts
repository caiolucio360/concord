import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/client'
import { createPreviewSender, pollScreenPreview, waitUntil } from './screenPreviewFlow'
import { PREVIEW_CAPTURE_EVERY_MS, PREVIEW_POLL_MS, PREVIEW_RETRY_MS } from './screenPreview'

describe('createPreviewSender', () => {
  it('tira e manda a foto da chamada certa', async () => {
    const upload = vi.fn(async () => {})
    const send = createPreviewSender({ capture: async (s: string) => `foto-${s}`, upload })
    expect(await send('c1', 'tela')).toBe(true)
    expect(upload).toHaveBeenCalledWith('c1', 'foto-tela')
  })

  it('pedidos seguidos viram uma foto só', async () => {
    let t = 0
    const capture = vi.fn(async () => 'x')
    const send = createPreviewSender({ capture, upload: async () => {}, now: () => t })
    expect(await send('c1', 's')).toBe(true)
    t = PREVIEW_CAPTURE_EVERY_MS - 1
    expect(await send('c1', 's')).toBe(false)
    t = PREVIEW_CAPTURE_EVERY_MS
    expect(await send('c1', 's')).toBe(true)
    expect(capture).toHaveBeenCalledTimes(2)
  })

  it('uma de cada vez, mesmo com o relógio liberando', async () => {
    let t = 0
    let release: (v: string) => void = () => {}
    const capture = vi.fn(() => new Promise<string>((r) => (release = r)))
    const send = createPreviewSender({ capture, upload: async () => {}, now: () => t })
    const first = send('c1', 's')
    t = 10 * PREVIEW_CAPTURE_EVERY_MS
    expect(await send('c1', 's')).toBe(false)
    release('x')
    expect(await first).toBe(true)
    expect(capture).toHaveBeenCalledTimes(1)
  })

  it('sem frame ou com erro no envio não quebra', async () => {
    let t = 0
    const now = (): number => (t += PREVIEW_CAPTURE_EVERY_MS)
    const noFrame = createPreviewSender({ capture: async () => null, upload: vi.fn(), now })
    expect(await noFrame('c1', 's')).toBe(false)
    const failing = createPreviewSender({
      capture: async () => 'x',
      upload: async () => {
        throw new Error('429')
      },
      now
    })
    expect(await failing('c1', 's')).toBe(false)
  })
})

function fakeStore<T>(initial: T): {
  getState: () => T
  subscribe: (fn: (s: T) => void) => () => void
  set: (s: T) => void
  listeners: () => number
} {
  let state = initial
  const subs = new Set<(s: T) => void>()
  return {
    getState: () => state,
    subscribe: (fn) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    set: (s) => {
      state = s
      subs.forEach((fn) => fn(s))
    },
    listeners: () => subs.size
  }
}

describe('waitUntil', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('já pronto resolve na hora', async () => {
    expect(await waitUntil(fakeStore(1), (n) => n === 1, 1000)).toBe(true)
  })

  it('espera o estado ficar pronto e para de ouvir', async () => {
    const store = fakeStore<string[]>([])
    const p = waitUntil(store, (s) => s.includes('ana'), 1000)
    store.set(['bia'])
    store.set(['bia', 'ana'])
    expect(await p).toBe(true)
    expect(store.listeners()).toBe(0)
  })

  it('desiste quando ready devolve null', async () => {
    const store = fakeStore('conectando')
    const p = waitUntil(store, (s) => (s === 'saiu' ? null : s === 'pronto'), 1000)
    store.set('saiu')
    expect(await p).toBe(false)
    expect(store.listeners()).toBe(0)
  })

  it('passa do prazo: false', async () => {
    vi.useFakeTimers()
    const store = fakeStore(0)
    const p = waitUntil(store, (n) => n > 0, 1000)
    vi.advanceTimersByTime(1000)
    expect(await p).toBe(false)
    expect(store.listeners()).toBe(0)
  })
})

describe('pollScreenPreview', () => {
  afterEach(() => vi.useRealTimers())

  const flush = async (): Promise<void> => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
  }

  it('busca já, rápido até a primeira foto e depois no ritmo normal', async () => {
    vi.useFakeTimers()
    const replies: (string | null)[] = [null, 'a', 'b']
    const fetch = vi.fn(async () => ({ image: replies.shift() ?? null }))
    const onImage = vi.fn()
    const stop = pollScreenPreview({ fetch, onImage, onEnded: vi.fn() })
    await flush()
    expect(fetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(PREVIEW_RETRY_MS)
    expect(onImage).toHaveBeenLastCalledWith('a')
    await vi.advanceTimersByTimeAsync(PREVIEW_POLL_MS - 1)
    expect(fetch).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(onImage).toHaveBeenLastCalledWith('b')
    stop()
  })

  it('parou de transmitir (404) ou perdi a permissão (403): avisa e não insiste', async () => {
    vi.useFakeTimers()
    for (const status of [404, 403]) {
      const fetch = vi.fn(async () => {
        throw new ApiError(status, 'x')
      })
      const onEnded = vi.fn()
      pollScreenPreview({ fetch, onImage: vi.fn(), onEnded })
      await flush()
      await vi.advanceTimersByTimeAsync(PREVIEW_POLL_MS * 2)
      expect(onEnded).toHaveBeenCalledTimes(1)
      expect(fetch).toHaveBeenCalledTimes(1)
    }
  })

  it('erro de rede: tenta de novo', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn(async () => {
      throw new Error('offline')
    })
    const stop = pollScreenPreview({ fetch, onImage: vi.fn(), onEnded: vi.fn() })
    await flush()
    await vi.advanceTimersByTimeAsync(PREVIEW_RETRY_MS)
    expect(fetch).toHaveBeenCalledTimes(2)
    stop()
  })

  it('parar (cartão fechou) não busca mais nem avisa resposta atrasada', async () => {
    vi.useFakeTimers()
    let reply: (v: { image: string | null }) => void = () => {}
    const fetch = vi.fn(() => new Promise<{ image: string | null }>((r) => (reply = r)))
    const onImage = vi.fn()
    const stop = pollScreenPreview({ fetch, onImage, onEnded: vi.fn() })
    stop()
    reply({ image: 'tarde' })
    await flush()
    await vi.advanceTimersByTimeAsync(PREVIEW_POLL_MS * 2)
    expect(onImage).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
