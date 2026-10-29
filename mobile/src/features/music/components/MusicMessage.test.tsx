import { fireEvent, render, screen } from '@testing-library/react-native'
import { MusicMessage } from './MusicMessage'
import { SlashSuggestions } from './SlashSuggestions'

describe('MusicMessage', () => {
  it('nome, selo BOT, hora e texto com negrito', async () => {
    await render(<MusicMessage content="🎵 adicionou **Boa noite**" createdAt="2026-10-28T09:05:00Z" timeZone="UTC" />)
    expect(screen.getByText('Maestro')).toBeOnTheScreen()
    expect(screen.getByText('BOT')).toBeOnTheScreen()
    expect(screen.getByText('09:05')).toBeOnTheScreen()
    expect(screen.getByText('Boa noite')).toBeOnTheScreen()
  })
})

describe('SlashSuggestions', () => {
  it('lista os comandos que combinam e completa ao tocar', async () => {
    const onPick = jest.fn()
    await render(<SlashSuggestions input="/pl" onPick={onPick} />)
    await fireEvent.press(screen.getByRole('button', { name: '/play <link ou nome>' }))
    expect(onPick).toHaveBeenCalledWith('/play ')
  })

  it('sem "/" ou depois do espaço, nada aparece', async () => {
    await render(<SlashSuggestions input="/play algo" onPick={jest.fn()} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
