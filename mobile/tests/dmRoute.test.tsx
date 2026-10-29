import { render } from '@testing-library/react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import ConversationRoute from '../app/(app)/dm/[conversationId]'
import { callController } from '../src/features/call/lib/callRuntime'
import { ChatScreen } from '../src/features/chat/components/ChatScreen'
import { useConversationsStore } from '../src/features/chat/store/conversationsStore'

jest.mock('expo-router', () => ({ useLocalSearchParams: jest.fn(), useRouter: jest.fn() }))
jest.mock('../src/features/chat/components/ChatScreen', () => ({ ChatScreen: jest.fn(() => null) }))
jest.mock('../src/features/call/lib/callRuntime', () => ({ callController: { callDm: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('../src/features/profile/hooks/useOpenProfile', () => ({ useOpenProfile: () => jest.fn() }))

const push = jest.fn()
const back = jest.fn()
const props = () => jest.mocked(ChatScreen).mock.calls.at(-1)![0]

const peer = { id: 'u9', username: 'zed', display_name: 'Zed' }
const conversation = { id: 'd1', type: 'dm', name: '', other_user: peer, members: [], unread_count: 0, created_at: '', updated_at: '' }

describe('rota da DM (/dm/<id>)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(useRouter).mockReturnValue({ push, back } as never)
    useConversationsStore.setState({ conversations: [conversation as never], status: 'ready' })
  })

  it('DM 1 a 1: abre o chat com a outra pessoa e o botão de ligar inicia a chamada privada e abre a tela da chamada', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ conversationId: 'd1', name: 'Zed', type: 'dm' })
    await render(<ConversationRoute />)
    expect(props()).toMatchObject({ variant: 'dm', id: 'd1', title: 'Zed', peerId: 'u9' })
    props().onCall!()
    expect(callController.callDm).toHaveBeenCalledWith({ id: 'd1', name: 'Zed' })
    expect(push).toHaveBeenCalledWith('/chamada')
  })

  it('grupo: variante de grupo e sem a outra pessoa', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ conversationId: 'd1', name: 'DEVS', type: 'group' })
    await render(<ConversationRoute />)
    expect(props()).toMatchObject({ variant: 'group', peerId: undefined })
  })

  it('sem nome na URL usa "conversa"; voltar volta', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ conversationId: 'd1' })
    await render(<ConversationRoute />)
    expect(props().title).toBe('conversa')
    props().onCall!()
    expect(callController.callDm).toHaveBeenCalledWith({ id: 'd1', name: 'conversa' })
    props().onBack()
    expect(back).toHaveBeenCalled()
  })
})
