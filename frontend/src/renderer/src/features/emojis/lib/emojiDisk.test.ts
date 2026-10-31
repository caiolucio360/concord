import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearEmojiDisk, readEmojiDisk, saveEmojiDisk } from './emojiDisk'

// Cache Storage mínimo em memória.
function fakeCaches() {
  const store = new Map<string, Response>()
  const cache = {
    match: vi.fn(async (k: string) => store.get(k)?.clone()),
    put: vi.fn(async (k: string, r: Response) => void store.set(k, r))
  }
  const caches = { open: vi.fn(async () => cache), delete: vi.fn(async () => true) }
  vi.stubGlobal('caches', caches)
  return { store, cache, caches }
}

describe('emojiDisk', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:emoji')
  })
  afterEach(() => vi.unstubAllGlobals())

  it('guarda o arquivo pelo id (sem o token) e devolve uma URL local na vez seguinte', async () => {
    const { store } = fakeCaches()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('png', { status: 200 })))

    expect(await readEmojiDisk('e1')).toBeNull()
    await saveEmojiDisk('e1', 'https://api/emojis/e1/file?token=t1')

    expect([...store.keys()]).toEqual(['/emoji-cache/e1'])
    expect(await readEmojiDisk('e1')).toBe('blob:emoji')
  })

  it('resposta com erro não vai para o disco', async () => {
    const { store } = fakeCaches()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 403 })))

    await saveEmojiDisk('e1', 'https://api/emojis/e1/file?token=t1')

    expect(store.size).toBe(0)
  })

  it('sem Cache Storage (ou com falha) tudo vira no-op', async () => {
    vi.stubGlobal('caches', undefined)
    expect(await readEmojiDisk('e1')).toBeNull()
    await expect(saveEmojiDisk('e1', 'x')).resolves.toBeUndefined()
    await expect(clearEmojiDisk()).resolves.toBeUndefined()

    vi.stubGlobal('caches', { open: vi.fn(async () => Promise.reject(new Error('quota'))), delete: vi.fn() })
    expect(await readEmojiDisk('e1')).toBeNull()
  })

  it('limpar apaga o cache inteiro (troca de conta)', async () => {
    const { caches } = fakeCaches()
    await clearEmojiDisk()
    expect(caches.delete).toHaveBeenCalledWith('concord-emojis-v1')
  })
})
