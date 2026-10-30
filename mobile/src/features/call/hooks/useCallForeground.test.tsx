import { act, renderHook } from '@testing-library/react-native'
import type { ForegroundPort } from '../lib/callForeground'
import { useCallSessionStore } from '../store/callSessionStore'
import { useCallForeground } from './useCallForeground'

describe('useCallForeground', () => {
  it('segue a sessão da chamada: liga ao entrar e desliga ao sair', async () => {
    useCallSessionStore.getState().reset()
    const port: jest.Mocked<ForegroundPort> = { start: jest.fn().mockResolvedValue(undefined), stop: jest.fn().mockResolvedValue(undefined) }
    await renderHook(() => useCallForeground(port))
    expect(port.start).not.toHaveBeenCalled()
    await act(async () => useCallSessionStore.getState().begin({ callId: 'c1', kind: 'channel', phase: 'active', channelId: 'ch', serverId: 's', name: 'voz' }))
    expect(port.start).toHaveBeenCalledWith({ title: 'voz' })
    await act(async () => useCallSessionStore.getState().reset())
    expect(port.stop).toHaveBeenCalledTimes(1)
  })
})
