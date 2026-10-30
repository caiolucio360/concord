import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { useAuthStore } from '../../auth/store/authStore'
import { useMusicStore } from '../../music/store/musicStore'
import { useCallSessionStore } from '../store/callSessionStore'
import { useCameraStore } from '../store/cameraStore'
import { useScreenShareStore } from '../store/screenShareStore'
import { useParticipantsStore } from '../store/participantsStore'
import { useSpeakingStore } from '../store/speakingStore'
import { useUserAudioStore } from '../store/userAudioStore'
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

describe('CallScreen: transmissão de tela', () => {
  const props = { onBack: jest.fn(), onLeave: jest.fn() }
  beforeEach(() => {
    useScreenShareStore.getState().reset()
    useParticipantsStore.getState().upsert(ana)
  })

  it('o botão liga a minha transmissão e vira "Parar de compartilhar" enquanto estou no ar', async () => {
    const onToggleShare = jest.fn()
    await render(<CallScreen {...props} onToggleShare={onToggleShare} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Compartilhar tela' }))
    expect(onToggleShare).toHaveBeenCalled()
    await act(async () => useScreenShareStore.getState().setSharing(true))
    expect(screen.getByRole('button', { name: 'Parar de compartilhar a tela' })).toBeOnTheScreen()
  })

  it('sem o controle de compartilhar (ex.: não injetado), não há botão', async () => {
    await render(<CallScreen {...props} />)
    expect(screen.queryByRole('button', { name: 'Compartilhar tela' })).toBeNull()
  })

  it('quem transmite ganha "Ao vivo · Assistir"; tocar assiste; assistindo mostra a tela e dá para parar', async () => {
    const onWatch = jest.fn()
    await render(<CallScreen {...props} onWatch={onWatch} renderScreen={(id) => <Text>{`tela de ${id}`}</Text>} />)
    await act(async () => useScreenShareStore.getState().setSharers(['u1']))
    await fireEvent.press(screen.getByRole('button', { name: 'Assistir à tela de Ana' }))
    expect(onWatch).toHaveBeenCalledWith('u1')
    await act(async () => useScreenShareStore.getState().setWatching('u1'))
    expect(screen.getByText('tela de u1')).toBeOnTheScreen()
    expect(screen.getByText('Assistindo a Ana')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Parar de assistir' }))
    expect(onWatch).toHaveBeenLastCalledWith(null)
  })

  it('sem como assistir, só mostra "Ao vivo"; eu mesmo não tenho o botão de assistir', async () => {
    await render(<CallScreen {...props} />)
    await act(async () => useScreenShareStore.getState().setSharers(['u1', 'me']))
    expect(screen.queryByRole('button', { name: /Assistir/ })).toBeNull()
    expect(screen.getAllByText('● Ao vivo').length).toBe(2)
  })
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

describe('CallScreen: layout', () => {
  const props = { onBack: jest.fn(), onLeave: jest.fn() }

  it('mostra o nome do canal e quantas pessoas estão na chamada (eu incluído)', async () => {
    useParticipantsStore.getState().upsert(ana)
    await render(<CallScreen {...props} />)
    expect(screen.getByText('Geral')).toBeOnTheScreen()
    expect(screen.getByText('2 pessoas na chamada')).toBeOnTheScreen()
  })

  it('sozinho na chamada: "1 pessoa" e o tile de quem já estava (bug: só aparecia quem entrava depois)', async () => {
    await render(<CallScreen {...props} />)
    expect(screen.getByText('1 pessoa na chamada')).toBeOnTheScreen()
    await act(async () => useParticipantsStore.getState().replace([ana], {}))
    expect(screen.getByLabelText('Ana')).toBeOnTheScreen()
  })

  it('quem fala ganha o anel verde; quem está mudo não', async () => {
    useParticipantsStore.getState().upsert(ana)
    await render(<CallScreen {...props} />)
    await act(async () => useSpeakingStore.getState().set(['u1']))
    expect(screen.getAllByTestId('speaking-ring')).toHaveLength(1)
  })

  it('a barra de baixo tem microfone, fone e sair', async () => {
    await render(<CallScreen {...props} />)
    for (const name of ['Silenciar microfone', 'Ensurdecer', 'Sair da chamada']) {
      expect(screen.getByRole('button', { name })).toBeOnTheScreen()
    }
  })
})

describe('CallScreen: câmera', () => {
  const props = { onBack: jest.fn(), onLeave: jest.fn() }

  it('quem está com a câmera ligada aparece em vídeo (eu inclusive); o botão liga a minha', async () => {
    useParticipantsStore.getState().upsert(ana)
    useCameraStore.getState().reset()
    const onToggleCamera = jest.fn()
    await render(<CallScreen {...props} onToggleCamera={onToggleCamera} onFlipCamera={jest.fn()} renderCamera={(id) => <Text>{`câmera de ${id}`}</Text>} />)
    expect(screen.queryByText('câmera de u1')).toBeNull()
    await act(async () => useCameraStore.getState().setCameras(['u1', 'me']))
    expect(screen.getByText('câmera de u1')).toBeOnTheScreen()
    expect(screen.getByText('câmera de me')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Ligar câmera' }))
    expect(onToggleCamera).toHaveBeenCalled()
  })
})

// Pedido do dono: não dava para abaixar nem silenciar o som de outra pessoa da chamada.
describe('CallScreen: volume de cada pessoa', () => {
  beforeEach(() => {
    useUserAudioStore.getState().reset()
    useParticipantsStore.getState().upsert(ana)
  })

  it('tocar em outra pessoa abre o volume dela; o meu tile não abre nada', async () => {
    await render(<CallScreen onBack={jest.fn()} onLeave={jest.fn()} />)
    expect(screen.queryByHintText('Ajustar o som de Eu')).toBeNull()
    await fireEvent.press(screen.getByHintText('Ajustar o som de Ana'))
    expect(screen.getByRole('adjustable', { name: 'Volume de Ana' })).toBeOnTheScreen()
  })

  it('quem eu silenciei aparece assim no tile', async () => {
    useUserAudioStore.getState().toggleMuted('u1')
    await render(<CallScreen onBack={jest.fn()} onLeave={jest.fn()} />)
    expect(screen.getByLabelText('Ana, silenciado para você')).toBeOnTheScreen()
  })
})
