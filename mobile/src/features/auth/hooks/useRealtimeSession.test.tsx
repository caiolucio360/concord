import { act, renderHook } from '@testing-library/react-native'
import { realtime } from '../../../shared/api/realtime'
import { AppState } from 'react-native'
import { useCallSessionStore } from '../../call/store/callSessionStore'
import { BACKGROUND_GRACE_MS } from '../../../shared/api/realtimeLifecycle'
import { useAuthStore } from '../store/authStore'
import { useRealtimeSession } from './useRealtimeSession'

jest.mock('expo-secure-store')
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => jest.fn()) }
}))
jest.mock('../../../shared/api/realtime', () => ({
  realtime: { connect: jest.fn(), disconnect: jest.fn(), subscribe: jest.fn(), retryNow: jest.fn(), suspend: jest.fn(), resume: jest.fn() }
}))
jest.mock('react-native/Libraries/AppState/AppState', () => {
  const listeners: ((s: string) => void)[] = []
  return {
    __esModule: true,
    default: {
      addEventListener: jest.fn((_: string, l: (s: string) => void) => (listeners.push(l), { remove: () => listeners.splice(listeners.indexOf(l), 1) })),
      emit: (s: string) => listeners.forEach((l) => l(s))
    }
  }
})

const ME = { id: 'u1', username: 'eu', display_name: 'Eu', email: 'e@x.co' }

describe('useRealtimeSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState(useAuthStore.getInitialState(), true)
  })

  it('logado: conecta; ao sair, desconecta', async () => {
    useAuthStore.setState({ status: 'signedIn' })
    const { unmount } = await renderHook(() => useRealtimeSession())
    expect(realtime.connect).toHaveBeenCalledTimes(1)
    await unmount()
    expect(realtime.disconnect).toHaveBeenCalled()
  })

  it('deslogado: não conecta', async () => {
    await renderHook(() => useRealtimeSession())
    expect(realtime.connect).not.toHaveBeenCalled()
  })

  // Regressão: o usuário só carrega (GET /users/me) depois do WebSocket abrir, então o cliente não
  // assinava a sala pessoal `user:<id>`: pedidos de amizade e mensagens de DM não chegavam ao vivo.
  it('assina a sala pessoal assim que o usuário carrega (depois de conectar)', async () => {
    useAuthStore.setState({ status: 'signedIn' })
    await renderHook(() => useRealtimeSession())
    expect(realtime.subscribe).not.toHaveBeenCalled()
    await act(async () => useAuthStore.setState({ user: ME }))
    expect(realtime.subscribe).toHaveBeenCalledWith('user:u1')
  })

  it('usuário já carregado na abertura: assina também', async () => {
    useAuthStore.setState({ status: 'signedIn', user: ME })
    await renderHook(() => useRealtimeSession())
    expect(realtime.subscribe).toHaveBeenCalledWith('user:u1')
  })

  // Regressão das notificações: o socket ficava aberto em segundo plano, o servidor via o app online e não mandava push.
  it('em segundo plano fora de chamada fecha a conexão; em chamada mantém; ao voltar retoma', async () => {
    jest.useFakeTimers()
    useAuthStore.setState({ status: 'signedIn' })
    useCallSessionStore.getState().reset()
    await renderHook(() => useRealtimeSession())
    const emit = (AppState as unknown as { emit: (s: string) => void }).emit
    emit('background')
    jest.advanceTimersByTime(BACKGROUND_GRACE_MS)
    expect(realtime.suspend).toHaveBeenCalledTimes(1)
    emit('active')
    expect(realtime.resume).toHaveBeenCalledTimes(1)

    await act(async () => useCallSessionStore.getState().begin({ callId: 'c1', kind: 'channel', phase: 'active', channelId: 'ch', serverId: 's', name: 'Geral' }))
    emit('background')
    jest.advanceTimersByTime(BACKGROUND_GRACE_MS * 2)
    expect(realtime.suspend).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })
})
