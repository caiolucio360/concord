import { render, screen } from '@testing-library/react-native'
import { NO_VOICE } from '../lib/callTypes'
import { ParticipantTile } from './ParticipantTile'

const ana = { id: 'u1', username: 'ana', display_name: 'Ana' }

describe('ParticipantTile', () => {
  it('mostra o nome e descreve o estado para o leitor de tela', async () => {
    await render(<ParticipantTile user={ana} speaking={false} voice={NO_VOICE} />)
    expect(screen.getByText('Ana')).toBeOnTheScreen()
    expect(screen.getByLabelText('Ana')).toBeOnTheScreen()
  })

  it('falando', async () => {
    await render(<ParticipantTile user={ana} speaking voice={NO_VOICE} />)
    expect(screen.getByLabelText('Ana, falando')).toBeOnTheScreen()
  })

  it('mudo e ensurdecido (inclusive por moderador)', async () => {
    await render(<ParticipantTile user={ana} speaking={false} voice={{ ...NO_VOICE, muted: true }} />)
    expect(screen.getByLabelText('Ana, mudo')).toBeOnTheScreen()
    await render(<ParticipantTile user={{ ...ana, id: 'u2', display_name: 'Bia' }} speaking={false} voice={{ ...NO_VOICE, serverDeafened: true }} />)
    expect(screen.getByLabelText('Bia, ensurdecido')).toBeOnTheScreen()
  })

  // Regressão: o avatar da chamada era sempre o quadro parado; o GIF só deve animar enquanto a pessoa fala.
  it('GIF animado: parado (/static) em silêncio e animado enquanto fala', async () => {
    const gif = { ...ana, avatar_url: '/api/profile-media/a_abc123' }
    await render(<ParticipantTile user={gif} speaking={false} voice={NO_VOICE} />)
    expect(screen.getByLabelText('Foto de Ana').props.source.uri).toMatch(/\/static$/)
    expect(screen.queryByTestId('avatar-animated', { includeHiddenElements: true })).toBeNull()
    await render(<ParticipantTile user={{ ...gif, id: 'u9', display_name: 'Caio' }} speaking voice={NO_VOICE} />)
    expect(screen.getByTestId('avatar-animated', { includeHiddenElements: true }).props.source.uri).not.toMatch(/static/)
  })

  it('mudo: mostra o selo de mudo e não anima o GIF mesmo se o servidor disser que fala', async () => {
    const gif = { ...ana, avatar_url: '/api/profile-media/a_abc123' }
    await render(<ParticipantTile user={gif} speaking voice={{ ...NO_VOICE, muted: true }} />)
    expect(screen.queryByTestId('avatar-animated', { includeHiddenElements: true })).toBeNull()
    expect(screen.getByLabelText('Ana, mudo')).toBeOnTheScreen()
  })

  it('tile grande: foto e altura vêm da grade', async () => {
    await render(<ParticipantTile user={ana} speaking={false} voice={NO_VOICE} height={300} avatarSize={96} />)
    expect(screen.getByLabelText('Ana').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ height: 300 })]))
  })

  it('o Maestro (bot) mostra o avatar dele e o nome, sem botão de assistir', async () => {
    await render(<ParticipantTile user={{ id: 'bot-music:ch1', username: '', display_name: 'Maestro', avatar_url: null, is_bot: true }} speaking={false} voice={NO_VOICE} />)
    expect(screen.getByText('Maestro')).toBeOnTheScreen()
    expect(screen.getByTestId('maestro-avatar')).toBeOnTheScreen()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
