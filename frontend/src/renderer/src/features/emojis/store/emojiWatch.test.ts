import { describe, expect, it, vi } from 'vitest'
import * as api from '../api/emojis'
import { useAuthStore } from '../../auth/store/authStore'
import { useServerStore } from '../../servers/store/serverStore'
import type { Server } from '../../servers/api/servers'
import { useEmojiStore } from './emojiStore'
import { sameServerIds, startEmojiWatch } from './emojiWatch'

describe('sameServerIds', () => {
  it('mesmos ids na mesma ordem ou não: igual', () => {
    expect(sameServerIds([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'a' }])).toBe(true)
  })
  it('entrou ou saiu de servidor: diferente', () => {
    expect(sameServerIds([{ id: 'a' }], [{ id: 'a' }, { id: 'b' }])).toBe(false)
    expect(sameServerIds([{ id: 'a' }, { id: 'b' }], [{ id: 'a' }, { id: 'c' }])).toBe(false)
  })
})

describe('startEmojiWatch', () => {
  const server = (id: string): Server => ({ id, name: id, owner_id: 'x' }) as Server

  it('recarrega quando a lista de servidores muda e zera ao trocar de conta', async () => {
    const fetch = vi.spyOn(api, 'fetchMyEmojis').mockResolvedValue([])
    startEmojiWatch()
    startEmojiWatch() // idempotente: não assina duas vezes
    useServerStore.setState({ servers: [server('a')] })
    expect(fetch).not.toHaveBeenCalled() // ainda não carregou: nada a recarregar

    await useEmojiStore.getState().ensureLoaded()
    expect(fetch).toHaveBeenCalledTimes(1)
    useServerStore.setState({ servers: [server('a')] }) // mesmos ids
    expect(fetch).toHaveBeenCalledTimes(1)
    useServerStore.setState({ servers: [server('a'), server('b')] })
    expect(fetch).toHaveBeenCalledTimes(2)
    await useEmojiStore.getState().reload()

    useAuthStore.setState({ user: { id: 'outra' } as never })
    expect(useEmojiStore.getState().loaded).toBe(false)
  })
})
