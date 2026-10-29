import { renderHook } from '@testing-library/react-native'
import { act } from 'react'
import { useAuthStore } from '../../auth/store/authStore'
import { useStartupPermissions } from './useStartupPermissions'

const mockAsk = jest.fn().mockResolvedValue([])
jest.mock('../lib/startupPermissions', () => ({ askStartupPermissions: () => mockAsk() }))

describe('useStartupPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({ status: 'loading' })
  })

  it('não pergunta antes de entrar na conta', async () => {
    await renderHook(() => useStartupPermissions())
    expect(mockAsk).not.toHaveBeenCalled()
    useAuthStore.setState({ status: 'signedOut' })
    expect(mockAsk).not.toHaveBeenCalled()
  })

  it('assim que a sessão abre, pergunta uma vez', async () => {
    await renderHook(() => useStartupPermissions())
    await act(async () => useAuthStore.setState({ status: 'signedIn' }))
    expect(mockAsk).toHaveBeenCalledTimes(1)
  })

  it('já logado ao abrir o app também pergunta', async () => {
    useAuthStore.setState({ status: 'signedIn' })
    await renderHook(() => useStartupPermissions())
    expect(mockAsk).toHaveBeenCalledTimes(1)
  })
})
