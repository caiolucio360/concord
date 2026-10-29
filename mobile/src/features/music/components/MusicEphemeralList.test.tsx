import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { ApiError } from '../../../shared/api/client'
import { pickSearchResult } from '../api/music'
import { useMusicStore } from '../store/musicStore'
import { MusicEphemeralList } from './MusicEphemeralList'

jest.mock('../api/music', () => ({ pickSearchResult: jest.fn(), getMusicState: jest.fn(), getMusicPresence: jest.fn() }))

const results = [
  { video_id: 'v1', title: 'Boa noite', artist: 'Artista', thumbnail: '', duration_ms: 65_000 },
  { video_id: 'v2', title: 'Bom dia', artist: 'Outro', thumbnail: 'https://t/x.jpg', duration_ms: 90_000 }
]
const search = (over = {}) => ({ token: 'tk', channel_id: 't1', query: 'lofi', expires_at: Date.now() + 60_000, results, ...over })
const reset = () => useMusicStore.setState({ state: null, ephemeral: [], presence: {}, serverOffsetMs: 0, panelOpen: false })
const emit = (type: string, payload: unknown) => act(() => useMusicStore.getState().handleWsEvent({ type, payload }))

describe('MusicEphemeralList', () => {
  beforeEach(() => {
    reset()
    jest.clearAllMocks()
  })

  it('sem respostas, nada aparece; resposta de outra sala também não', async () => {
    await render(<MusicEphemeralList room="channel:t1" serverId="s1" />)
    await emit('music:reply', { channel_id: 'outro', text: 'oi' })
    expect(screen.queryByText('Maestro')).toBeNull()
  })

  it('resposta em texto: negrito, aviso "só você vê" e dispensar', async () => {
    await render(<MusicEphemeralList room="channel:t1" serverId="s1" />)
    await emit('music:reply', { channel_id: 't1', text: 'Tocando **Boa noite** agora' })
    expect(screen.getByText('Maestro')).toBeOnTheScreen()
    expect(screen.getByText('Boa noite')).toBeOnTheScreen()
    expect(screen.getByText(/Só você vê esta mensagem/)).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Dispensar' }))
    expect(screen.queryByText('Maestro')).toBeNull()
  })

  it('busca: tocar num resultado adiciona à fila e some', async () => {
    jest.mocked(pickSearchResult).mockResolvedValue(undefined)
    await render(<MusicEphemeralList room="channel:t1" serverId="s1" />)
    await emit('music:search', search())
    expect(screen.getByText('🔎 Resultados para "lofi": clique para adicionar à fila')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar Bom dia' }))
    expect(pickSearchResult).toHaveBeenCalledWith('s1', 'tk', 1)
    expect(await screen.findByText('Dispensar', {}, { timeout: 50 }).catch(() => null)).toBeNull()
  })

  it('410 (expirou) apaga as opções; outro erro mostra o aviso e deixa tentar de novo', async () => {
    await render(<MusicEphemeralList room="channel:t1" serverId="s1" />)
    await emit('music:search', search())
    jest.mocked(pickSearchResult).mockRejectedValueOnce(new Error('rede'))
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar Boa noite' }))
    expect(await screen.findByText('Não foi possível adicionar. Tente de novo.')).toBeOnTheScreen()
    jest.mocked(pickSearchResult).mockRejectedValueOnce(new ApiError(410, 'gone'))
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar Boa noite' }))
    await act(async () => {})
    expect(useMusicStore.getState().ephemeral[0].expired).toBe(true)
    expect(screen.getByRole('button', { name: 'Adicionar Boa noite' })).toBeDisabled()
  })

  it('busca já vencida entra apagada; vence sozinha depois do prazo', async () => {
    jest.useFakeTimers()
    await render(<MusicEphemeralList room="channel:t1" serverId="s1" />)
    await emit('music:search', search({ expires_at: Date.now() - 1 }))
    expect(useMusicStore.getState().ephemeral[0].expired).toBe(true)
    reset()
    await emit('music:search', search({ expires_at: Date.now() + 1000 }))
    await act(async () => void jest.advanceTimersByTime(1100))
    expect(useMusicStore.getState().ephemeral[0].expired).toBe(true)
    jest.useRealTimers()
  })

  it('busca sem serverId (fora de um servidor) não mostra os resultados', async () => {
    await render(<MusicEphemeralList room="channel:t1" serverId={null} />)
    await emit('music:search', search())
    expect(screen.queryByText(/Resultados para/)).toBeNull()
  })
})
