import { fireEvent, render, screen } from '@testing-library/react-native'
import { useAuthStore } from '../../auth/store/authStore'
import { useMusicStore } from '../../music/store/musicStore'
import { useCallSessionStore } from '../store/callSessionStore'
import { useParticipantsStore } from '../store/participantsStore'
import { useSpeakingStore } from '../store/speakingStore'
import { CallScreen } from './CallScreen'

jest.mock('react-native-safe-area-context', () => ({ ...jest.requireActual('react-native-safe-area-context'), useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }))

const ana = { id: 'u1', username: 'ana', display_name: 'Ana' }

beforeEach(() => {
  useCallSessionStore.getState().reset()
  useParticipantsStore.getState().reset()
  useSpeakingStore.getState().reset()
  useAuthStore.setState({ status: 'signedIn', user: { id: 'me', username: 'eu', display_name: 'Eu', email: 'e@e.co' } })
  useCallSessionStore.getState().begin({ callId: 'c1', kind: 'channel', phase: 'active', channelId: 'ch1', name: 'Geral' })
})

describe('CallScreen: Maestro', () => {
  const playing = { call_id: 'c1', channel_id: 'ch1', server_id: 's1', server_time: Date.now(), now: null, queue: [], skip: { votes: 0, needed: 1, voters: [] } }

  it('com música tocando no canal do servidor, o botão abre o painel "Tocando agora"', async () => {
    useCallSessionStore.getState().reset()
    useCallSessionStore.getState().begin({ callId: 'c1', kind: 'channel', phase: 'active', channelId: 'ch1', serverId: 's1', name: 'Geral' })
    useMusicStore.setState({ state: playing, panelOpen: false })
    await render(<CallScreen onBack={jest.fn()} onLeave={jest.fn()} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Tocando agora' }))
    expect(useMusicStore.getState().panelOpen).toBe(true)
  })

  it('sem música, não há o botão', async () => {
    useMusicStore.setState({ state: null })
    await render(<CallScreen onBack={jest.fn()} onLeave={jest.fn()} />)
    expect(screen.queryByRole('button', { name: 'Tocando agora' })).toBeNull()
  })
})

describe('CallScreen', () => {
  it('mostra o canal, eu e os participantes', async () => {
    useParticipantsStore.getState().upsert(ana)
    await render(<CallScreen onBack={jest.fn()} onLeave={jest.fn()} />)
    expect(screen.getByText('Geral')).toBeOnTheScreen()
    expect(screen.getByText('Eu')).toBeOnTheScreen()
    expect(screen.getByText('Ana')).toBeOnTheScreen()
  })

  it('quem fala aparece em destaque', async () => {
    useParticipantsStore.getState().upsert(ana)
    useSpeakingStore.getState().set(['u1'])
    await render(<CallScreen onBack={jest.fn()} onLeave={jest.fn()} />)
    expect(screen.getByLabelText('Ana, falando')).toBeOnTheScreen()
  })

  it('mostra o estado da conexão', async () => {
    useCallSessionStore.getState().setPhase('reconnecting')
    await render(<CallScreen onBack={jest.fn()} onLeave={jest.fn()} />)
    expect(screen.getByText('Reconectando…')).toBeOnTheScreen()
  })

  it('Sair da chamada e Minimizar chamam as ações', async () => {
    const onBack = jest.fn()
    const onLeave = jest.fn()
    await render(<CallScreen onBack={onBack} onLeave={onLeave} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Sair da chamada' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Minimizar chamada' }))
    expect(onLeave).toHaveBeenCalled()
    expect(onBack).toHaveBeenCalled()
  })

  it('tem os botões de microfone e fone', async () => {
    await render(<CallScreen onBack={jest.fn()} onLeave={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'Silenciar microfone' })).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: 'Ensurdecer' })).toBeOnTheScreen()
  })
})
