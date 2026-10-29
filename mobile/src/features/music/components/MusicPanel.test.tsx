import { fireEvent, render, screen } from '@testing-library/react-native'
import { useAuthStore } from '../../auth/store/authStore'
import { removeQueueItem, skipMusic, type MusicItem, type MusicState } from '../api/music'
import { useMusicStore } from '../store/musicStore'
import { MusicPanel } from './MusicPanel'

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }))
jest.mock('../api/music', () => ({ skipMusic: jest.fn().mockResolvedValue({}), removeQueueItem: jest.fn().mockResolvedValue(undefined), getMusicState: jest.fn(), getMusicPresence: jest.fn() }))

const item = (id: string, by: string): MusicItem => ({
  id,
  video_id: id,
  title: `Música ${id}`,
  artist: 'Artista',
  thumbnail: '',
  duration_ms: 125_000,
  requested_by: { id: by, username: by, display_name: by },
  has_video: false,
  video_ready: false
})
const state = (over: Partial<MusicState> = {}): MusicState => ({
  call_id: 'c1',
  channel_id: 'v1',
  server_id: 's1',
  server_time: Date.now(),
  now: { item: item('1', 'me'), started_at: Date.now() - 30_000 },
  queue: [],
  skip: { votes: 1, needed: 2, voters: [] },
  ...over
})
const open = (s: MusicState | null) => useMusicStore.setState({ state: s, panelOpen: true, serverOffsetMs: 0 })

describe('MusicPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({ user: { id: 'me', username: 'me', display_name: 'Eu', email: 'e@e.co' } })
  })

  it('fechado ou sem estado, nada aparece', async () => {
    useMusicStore.setState({ state: state(), panelOpen: false })
    await render(<MusicPanel serverId="s1" />)
    expect(screen.queryByText('Tocando agora')).toBeNull()
  })

  it('mostra a faixa, a duração e, sendo minha, o botão Pular', async () => {
    open(state())
    await render(<MusicPanel serverId="s1" />)
    expect(screen.getByText('Música 1')).toBeOnTheScreen()
    expect(screen.getByText('2:05')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Pular' }))
    expect(skipMusic).toHaveBeenCalledWith('s1')
  })

  it('música dos outros: votar para pular, e já votei desativa', async () => {
    open(state({ now: { item: item('1', 'outro'), started_at: Date.now() } }))
    const { unmount } = await render(<MusicPanel serverId="s1" />)
    expect(screen.getByRole('button', { name: 'Votar para pular · 1/2' })).toBeEnabled()
    await unmount()
    open(state({ now: { item: item('1', 'outro'), started_at: Date.now() }, skip: { votes: 1, needed: 2, voters: ['me'] } }))
    await render(<MusicPanel serverId="s1" />)
    expect(screen.getByRole('button', { name: 'Votar para pular · 1/2' })).toBeDisabled()
  })

  it('fila vazia mostra a dica; com mais de 3, "Ver mais" expande e "Ver menos" recolhe', async () => {
    open(state())
    const { unmount } = await render(<MusicPanel serverId="s1" />)
    expect(screen.getByText('Nada na fila. Use /play')).toBeOnTheScreen()
    await unmount()
    open(state({ queue: ['a', 'b', 'c', 'd', 'e'].map((id) => item(id, 'outro')) }))
    await render(<MusicPanel serverId="s1" />)
    expect(screen.queryByText('Música e')).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: 'Ver mais (2)' }))
    expect(screen.getByText('Música e')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Ver menos' }))
    expect(screen.queryByText('Música e')).toBeNull()
  })

  it('só as minhas músicas têm botão de remover', async () => {
    open(state({ queue: [item('a', 'me'), item('b', 'outro')] }))
    await render(<MusicPanel serverId="s1" />)
    expect(screen.queryByRole('button', { name: 'Remover Música b' })).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: 'Remover Música a' }))
    expect(removeQueueItem).toHaveBeenCalledWith('s1', 'a')
  })

  it('fechar esconde o painel', async () => {
    open(state())
    await render(<MusicPanel serverId="s1" />)
    await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }))
    expect(useMusicStore.getState().panelOpen).toBe(false)
  })
})
