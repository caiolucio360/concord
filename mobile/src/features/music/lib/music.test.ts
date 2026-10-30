import type { MusicItem } from '../api/music'
import { canSwap, formatDuration, isMaestroMessageKind, slashSuggestions, splitBold, isMaestroIdentity } from './music'

const item = (id: string, by: string): MusicItem => ({
  id,
  video_id: id,
  title: id,
  artist: 'a',
  thumbnail: '',
  duration_ms: 1000,
  requested_by: { id: by, username: by, display_name: by },
  has_video: false,
  video_ready: false
})

describe('lib do Maestro', () => {
  it('formatDuration: minutos e horas', () => {
    expect(formatDuration(65_000)).toBe('1:05')
    expect(formatDuration(3_725_000)).toBe('1:02:05')
    expect(formatDuration(0)).toBe('0:00')
  })

  it('slashSuggestions: só com "/" e antes do primeiro espaço; casa nome ou apelido', () => {
    expect(slashSuggestions('oi')).toEqual([])
    expect(slashSuggestions('/play algo')).toEqual([])
    expect(slashSuggestions('/pl').map((s) => s.command)).toEqual(['/play'])
    expect(slashSuggestions('/p').map((s) => s.command)).toEqual(['/play', '/skip']) // /pular é apelido do /skip
    expect(slashSuggestions('/aj').map((s) => s.command)).toEqual(['/help'])
    expect(slashSuggestions('/').length).toBe(4)
  })

  it('splitBold alterna negrito e descarta vazios', () => {
    expect(splitBold('a **b** c')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c', bold: false }
    ])
    expect(splitBold('**x**')).toEqual([{ text: 'x', bold: true }])
  })

  it('canSwap: só duas músicas diferentes minhas', () => {
    expect(canSwap(item('1', 'me'), item('2', 'me'), 'me')).toBe(true)
    expect(canSwap(item('1', 'me'), item('1', 'me'), 'me')).toBe(false)
    expect(canSwap(item('1', 'me'), item('2', 'outro'), 'me')).toBe(false)
    expect(canSwap(item('1', 'me'), item('2', 'me'), null)).toBe(false)
  })

  it('isMaestroMessageKind', () => {
    expect(isMaestroMessageKind('music')).toBe(true)
    expect(isMaestroMessageKind('music_commands')).toBe(true)
    expect(isMaestroMessageKind('birthday')).toBe(false)
    expect(isMaestroMessageKind(null)).toBe(false)
  })
})

describe('isMaestroIdentity', () => {
  it('só a identidade do bot de música na sala de mídia', () => {
    expect(isMaestroIdentity('bot-music:ch1')).toBe(true)
    expect(isMaestroIdentity('4d414553-5452-4f00-8000-000000000001')).toBe(false)
    expect(isMaestroIdentity('u1')).toBe(false)
  })
})
