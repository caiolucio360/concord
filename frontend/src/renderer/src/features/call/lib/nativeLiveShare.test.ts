import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NativeLiveEvent } from '../../../../../shared/nativeLive'

vi.mock('../api/calls', () => ({
  getScreenToken: vi.fn(async () => ({ token: 'jwt', identity: 'eu:screen' }))
}))
vi.mock('../../../shared/lib/config', () => ({ LIVEKIT_URL: 'wss://salinha.example' }))

import { useNativeLiveStore } from '../store/nativeLiveStore'
import { nativeLiveActive, nativeLivePreview, setNativeLiveQuality, stopNativeLive, tryNativeLive } from './nativeLiveShare'
import type { CallMedia } from './livekit'

let listener: ((event: NativeLiveEvent) => void) | null = null
const bridge = {
  availability: vi.fn(),
  start: vi.fn(async () => true),
  setQuality: vi.fn(),
  stop: vi.fn(),
  onEvent: vi.fn((cb: (event: NativeLiveEvent) => void) => {
    listener = cb
    return () => (listener = null)
  })
}
const emit = (event: NativeLiveEvent): void => listener?.(event)
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))
const media = () => ({ setNativeScreen: vi.fn() }) as unknown as CallMedia & { setNativeScreen: ReturnType<typeof vi.fn> }
const QUALITY = { resolution: '1080p', frameRate: 30 } as const

function available(nvidia: boolean, pref: boolean | null = null): void {
  useNativeLiveStore.setState({
    pref,
    availability: { available: true, nvidia },
    load: async () => ({ available: true, nvidia })
  })
}

describe('tryNativeLive', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { api: { nativeLive: bridge } })
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} })
  })
  afterEach(() => {
    stopNativeLive(null)
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('sem o motor (AMD no automático): segue pelo Chromium sem abrir o helper', async () => {
    available(false)
    const result = await tryNativeLive({ callId: 'c1', quality: QUALITY, media: media(), onEnded: vi.fn() })
    expect(result).toBe('fallback')
    expect(bridge.start).not.toHaveBeenCalled()
  })

  it('no ar: a CallMedia passa a conhecer a live nativa; a troca de degrau vai ao helper', async () => {
    available(true)
    const m = media()
    const result = tryNativeLive({ callId: 'c1', quality: QUALITY, media: m, onEnded: vi.fn() })
    await flush()
    emit({ event: 'published', codec: 'h264', audio: false })
    expect(await result).toBe('started')
    expect(m.setNativeScreen).toHaveBeenCalledWith(expect.objectContaining({ identity: 'eu:screen' }))
    expect(nativeLiveActive()).toBe(true)
    expect(setNativeLiveQuality({ resolution: '720p', frameRate: 30 })).toBe(true)
    expect(bridge.setQuality).toHaveBeenCalled()
    const own = {} as MediaStream
    expect(nativeLivePreview({ eu: own }, 'eu')).toEqual({ localScreenStream: own })
  })

  it('falhou ao começar: Chromium, e não tenta de novo nesta sessão', async () => {
    available(true, true)
    const result = tryNativeLive({ callId: 'c1', quality: QUALITY, media: media(), onEnded: vi.fn() })
    await flush()
    emit({ event: 'error', code: 'publish_failed', message: 'x' })
    emit({ event: 'ended', reason: 'publish_failed' })
    expect(await result).toBe('fallback')
    bridge.start.mockClear()
    expect(await tryNativeLive({ callId: 'c1', quality: QUALITY, media: media(), onEnded: vi.fn() })).toBe('fallback')
    expect(bridge.start).not.toHaveBeenCalled()
  })
})

describe('nativeLivePreview', () => {
  it('sem live nativa: não mexe na prévia', () => {
    expect(nativeLivePreview({}, 'eu')).toBeNull()
  })
})
