import { act, renderHook } from '@testing-library/react-native'
import type { WsEvent } from '../../../shared/api/ws'
import { useAuthStore } from '../../auth/store/authStore'
import { useActiveRoomStore } from '../../chat/store/activeRoomStore'
import { presentInApp } from '../lib/expoPush'
import { useInAppNotifications } from './useInAppNotifications'

let wsHandler: (event: WsEvent) => void = () => {}
jest.mock('../../../shared/api/ws', () => ({
  onWsEvent: jest.fn((l: (e: WsEvent) => void) => ((wsHandler = l), () => {}))
}))
jest.mock('../lib/expoPush', () => ({ presentInApp: jest.fn().mockResolvedValue(undefined) }))

const ME = { id: 'me', username: 'mugis', display_name: 'Mugis', email: 'm@x.co' }
const dm = { id: 'm1', author_id: 'u1', author: { id: 'u1', username: 'ana', display_name: 'Ana' }, conversation_id: 'c1', content: 'oi', created_at: '2026-10-30T01:00:00Z' }
const emit = (type: string, payload: object) => act(async () => wsHandler({ type, payload }))

describe('useInAppNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    wsHandler = () => {}
    useActiveRoomStore.setState({ active: null })
  })

  it('DM chegando com o app aberto e outra tela na frente: mostra o aviso', async () => {
    useAuthStore.setState({ status: 'signedIn', user: ME })
    await renderHook(() => useInAppNotifications())
    await emit('message:create', { message: dm })
    expect(presentInApp).toHaveBeenCalledWith(expect.objectContaining({ title: 'Ana', body: 'oi' }))
  })

  it('com a DM aberta, ou outro evento, não avisa', async () => {
    useAuthStore.setState({ status: 'signedIn', user: ME })
    useActiveRoomStore.setState({ active: { kind: 'conversation', id: 'c1' } })
    await renderHook(() => useInAppNotifications())
    await emit('message:create', { message: dm })
    await emit('message:update', { message: { ...dm, conversation_id: 'c9' } })
    expect(presentInApp).not.toHaveBeenCalled()
  })

  it('deslogado não escuta', async () => {
    useAuthStore.setState({ status: 'signedOut', user: null })
    await renderHook(() => useInAppNotifications())
    await emit('message:create', { message: dm })
    expect(presentInApp).not.toHaveBeenCalled()
  })
})
