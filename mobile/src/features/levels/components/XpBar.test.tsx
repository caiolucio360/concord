import { act, render, renderHook, screen } from '@testing-library/react-native'
import { onWsEvent, type WsEvent } from '../../../shared/api/ws'
import { useAuthStore } from '../../auth/store/authStore'
import { fetchMyLevel } from '../api/levels'
import { useLevelEvents } from '../hooks/useLevelEvents'
import { formatVoiceTime, levelPercent, minutesToNext } from '../lib/levels'
import { useLevelStore } from '../store/levelStore'
import { XpBar } from './XpBar'

jest.mock('../../../shared/api/ws', () => ({ onWsEvent: jest.fn() }))
jest.mock('../api/levels', () => ({ fetchLevels: jest.fn(), fetchMyLevel: jest.fn() }))

const me = { user_id: 'u1', level: 12, xp: 5000, xp_into_level: 75, xp_for_next: 150, voice_seconds: 4500 }

describe('contas do XP', () => {
  it('percentual, tempo de call e minutos que faltam', () => {
    expect(levelPercent(75, 150)).toBe(50)
    expect(levelPercent(10, 0)).toBe(0)
    expect(levelPercent(500, 150)).toBe(100)
    expect(formatVoiceTime(45 * 60)).toBe('45 min')
    expect(formatVoiceTime(200 * 60)).toBe('3 h 20 min')
    expect(formatVoiceTime(12 * 3600)).toBe('12 h')
    expect(minutesToNext(75, 150)).toBe(8)
    expect(minutesToNext(200, 150)).toBe(0)
  })
})

describe('XpBar', () => {
  beforeEach(() => useLevelStore.setState({ me: null, levels: {} }))

  it('sem dados do nível, não mostra nada', async () => {
    await render(<XpBar paused={false} />)
    expect(screen.queryByText(/Nível/)).toBeNull()
  })

  it('mostra o nível, o XP e a barra; descrição para o leitor de tela', async () => {
    useLevelStore.setState({ me })
    await render(<XpBar paused={false} />)
    expect(screen.getByText('Nível 12')).toBeOnTheScreen()
    expect(screen.getByText('75/150 XP')).toBeOnTheScreen()
    expect(screen.getByRole('progressbar')).toHaveProp('accessibilityValue', { min: 0, max: 100, now: 50 })
    expect(screen.getByLabelText(/1 h 15 min de call no total, faltam cerca de 8 min para o nível 13/)).toBeOnTheScreen()
  })

  it('mutado ou ensurdecido, o XP está pausado', async () => {
    useLevelStore.setState({ me })
    await render(<XpBar paused />)
    expect(screen.getByText('XP pausado (mutado)')).toBeOnTheScreen()
  })
})

describe('useLevelEvents', () => {
  let listener: (e: WsEvent) => void = () => {}
  beforeEach(() => {
    jest.clearAllMocks()
    useLevelStore.setState({ me: null, levels: {} })
    jest.mocked(fetchMyLevel).mockResolvedValue(me)
    jest.mocked(onWsEvent).mockImplementation((l) => {
      listener = l
      return jest.fn()
    })
  })

  it('deslogado não carrega nada', async () => {
    useAuthStore.setState({ ...useAuthStore.getInitialState(), status: 'signedOut' })
    await renderHook(() => useLevelEvents())
    expect(fetchMyLevel).not.toHaveBeenCalled()
  })

  it('logado carrega o nível e segue o level:update; outros eventos são ignorados', async () => {
    useAuthStore.setState({ ...useAuthStore.getInitialState(), status: 'signedIn' })
    await renderHook(() => useLevelEvents())
    await act(async () => {})
    expect(useLevelStore.getState().me?.level).toBe(12)
    act(() => listener({ type: 'level:update', payload: { ...me, level: 13, xp_into_level: 5 } }))
    expect(useLevelStore.getState().me?.level).toBe(13)
    act(() => listener({ type: 'message:create', payload: {} }))
    expect(useLevelStore.getState().me?.level).toBe(13)
  })

  it('falha ao carregar o nível não derruba', async () => {
    jest.mocked(fetchMyLevel).mockRejectedValue(new Error('x'))
    useAuthStore.setState({ ...useAuthStore.getInitialState(), status: 'signedIn' })
    await renderHook(() => useLevelEvents())
    await act(async () => {})
    expect(useLevelStore.getState().me).toBeNull()
  })
})
