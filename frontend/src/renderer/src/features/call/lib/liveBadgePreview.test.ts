import { describe, expect, it } from 'vitest'
import type { CallStateResponse } from '../api/calls'
import {
  liveWatcherCount,
  nextPreviewMode,
  opensOnHover,
  placedCardStyle,
  watchersLabel,
  type PreviewMode
} from './liveBadgePreview'

describe('nextPreviewMode', () => {
  const run = (events: Parameters<typeof nextPreviewMode>[1][]): PreviewMode =>
    events.reduce<PreviewMode>(nextPreviewMode, 'closed')

  it('passar o mouse abre; tirar fecha', () => {
    expect(run(['hover'])).toBe('hover')
    expect(run(['hover', 'unhover'])).toBe('closed')
  })

  it('toque/clique fixa aberta: tirar o mouse não fecha', () => {
    expect(run(['tap'])).toBe('pinned')
    expect(run(['hover', 'tap'])).toBe('pinned')
    expect(run(['tap', 'unhover'])).toBe('pinned')
    expect(run(['tap', 'hover'])).toBe('pinned')
  })

  it('segundo toque, Esc ou clique fora fecham', () => {
    expect(run(['tap', 'tap'])).toBe('closed')
    expect(run(['tap', 'dismiss'])).toBe('closed')
    expect(run(['hover', 'dismiss'])).toBe('closed')
  })
})

describe('opensOnHover', () => {
  it('só o mouse abre ao passar; toque e caneta abrem no toque', () => {
    expect(opensOnHover('mouse')).toBe(true)
    expect(opensOnHover('touch')).toBe(false)
    expect(opensOnHover('pen')).toBe(false)
  })
})

describe('liveWatcherCount', () => {
  const entry = {
    call: null,
    participants: [],
    screen_watchers: { bia: [{ id: 'x', username: 'x', display_name: 'X' }] }
  } as CallStateResponse

  it('na minha chamada vale a lista ao vivo (call:screen_watchers)', () => {
    expect(liveWatcherCount('bia', entry, ['a', 'b'])).toBe(2)
    expect(liveWatcherCount('bia', entry, [])).toBe(0)
  })

  it('de fora vale o que a lista do servidor diz', () => {
    expect(liveWatcherCount('bia', entry, null)).toBe(1)
    expect(liveWatcherCount('caio', entry, null)).toBe(0)
    expect(liveWatcherCount('bia', undefined, null)).toBe(0)
  })
})

describe('watchersLabel', () => {
  it('conta quem assiste', () => {
    expect(watchersLabel(0)).toBe('Ninguém assistindo')
    expect(watchersLabel(1)).toBe('1 assistindo')
    expect(watchersLabel(12)).toBe('12 assistindo')
  })
})

describe('placedCardStyle', () => {
  it('escondido até saber onde cabe; depois no lugar', () => {
    expect(placedCardStyle(null)).toEqual({ left: -9999, top: 0, visibility: 'hidden' })
    expect(placedCardStyle({ left: 10, top: 20 })).toEqual({
      left: 10,
      top: 20,
      visibility: 'visible'
    })
  })
})
