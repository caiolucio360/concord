import { renderHook } from '@testing-library/react-native'
import { useRouter } from 'expo-router'
import { callController } from '../../call/lib/callRuntime'
import { useConversationsStore } from '../store/conversationsStore'
import { useDmScreenProps } from './useDmScreenProps'

jest.mock('expo-router', () => ({ useRouter: jest.fn() }))
jest.mock('../../call/lib/callRuntime', () => ({ callController: { callDm: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('../../profile/hooks/useOpenProfile', () => ({ useOpenProfile: () => jest.fn() }))

const push = jest.fn()
const back = jest.fn()
const peer = { id: 'u9', username: 'zed', display_name: 'Zed' }
const conversation = { id: 'd1', type: 'dm', name: '', other_user: peer, members: [], unread_count: 0, created_at: '', updated_at: '' }

describe('useDmScreenProps', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useRouter).mockReturnValue({ push, back } as never)
    useConversationsStore.setState({ conversations: [conversation as never], status: 'ready' })
  })

  it('DM 1 a 1: chat com a outra pessoa; ligar inicia a chamada privada e abre a tela da chamada', async () => {
    const { result } = await renderHook(() => useDmScreenProps({ conversationId: 'd1', name: 'Zed', type: 'dm' }))
    expect(result.current).toMatchObject({ variant: 'dm', id: 'd1', title: 'Zed', peerId: 'u9' })
    result.current.onCall!()
    expect(callController.callDm).toHaveBeenCalledWith({ id: 'd1', name: 'Zed' })
    expect(push).toHaveBeenCalledWith('/chamada')
  })

  it('grupo: variante de grupo e sem a outra pessoa', async () => {
    const { result } = await renderHook(() => useDmScreenProps({ conversationId: 'd1', name: 'DEVS', type: 'group' }))
    expect(result.current).toMatchObject({ variant: 'group', peerId: undefined })
  })

  it('sem nome na URL usa "conversa"; voltar volta', async () => {
    const { result } = await renderHook(() => useDmScreenProps({ conversationId: 'd1' }))
    expect(result.current.title).toBe('conversa')
    result.current.onCall!()
    expect(callController.callDm).toHaveBeenCalledWith({ id: 'd1', name: 'conversa' })
    result.current.onBack()
    expect(back).toHaveBeenCalled()
  })
})
