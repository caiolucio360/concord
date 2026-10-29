import { renderHook } from '@testing-library/react-native'
import { act } from 'react'
import { onWsEvent, type WsEvent } from '../../../shared/api/ws'
import { useCallSessionStore } from '../../call/store/callSessionStore'
import { getMusicState } from '../api/music'
import { useMusicStore } from '../store/musicStore'
import { useMusicEvents } from './useMusicEvents'

jest.mock('../../../shared/api/ws', () => ({ onWsEvent: jest.fn() }))
jest.mock('../api/music', () => ({ getMusicState: jest.fn(), getMusicPresence: jest.fn() }))

let listener: (e: WsEvent) => void = () => {}
const off = jest.fn()

describe('useMusicEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useCallSessionStore.getState().reset()
    useMusicStore.setState({ state: null, ephemeral: [], presence: {}, serverOffsetMs: 0, panelOpen: false })
    jest.mocked(onWsEvent).mockImplementation((l) => {
      listener = l
      return off
    })
    jest.mocked(getMusicState).mockResolvedValue(null)
  })

  it('repassa só os eventos music:* à store e desliga ao desmontar', async () => {
    const { unmount } = await renderHook(() => useMusicEvents())
    act(() => {
      listener({ type: 'music:reply', payload: { channel_id: 't1', text: 'oi' } })
      listener({ type: 'message:create', payload: {} })
    })
    expect(useMusicStore.getState().ephemeral).toHaveLength(1)
    await unmount()
    expect(off).toHaveBeenCalled()
  })

  it('numa chamada de canal carrega o estado; ao sair, limpa', async () => {
    const { unmount } = await renderHook(() => useMusicEvents())
    expect(getMusicState).not.toHaveBeenCalled()
    await act(async () => {
      useCallSessionStore.getState().begin({ callId: 'c1', kind: 'channel', phase: 'active', channelId: 'v1', serverId: 's1', name: 'Geral' })
    })
    expect(getMusicState).toHaveBeenCalledWith('s1')
    useMusicStore.setState({ panelOpen: true })
    await unmount()
    expect(useMusicStore.getState().panelOpen).toBe(false)
  })

  it('chamada de DM não carrega o Maestro', async () => {
    useCallSessionStore.getState().begin({ callId: 'c2', kind: 'dm', phase: 'active', name: 'Ana' })
    await renderHook(() => useMusicEvents())
    expect(getMusicState).not.toHaveBeenCalled()
  })
})
