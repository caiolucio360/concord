import { describe, expect, it, vi } from 'vitest'
import type { MusicEphemeral } from '../store/musicStore'

const ephemeral: MusicEphemeral[] = [
  { id: 'e1', room: 'channel:c1', kind: 'text', text: 'Fila vazia' },
  {
    id: 'e2',
    room: 'channel:c1',
    kind: 'search',
    expired: true,
    search: {
      token: 't',
      query: 'lofi',
      expires_at: 0,
      results: [{ video_id: 'v', title: 'Lofi', artist: 'X', duration_ms: 60_000, thumbnail: '' }]
    } as unknown as MusicEphemeral['search']
  }
]
vi.mock('../store/musicStore', () => ({
  useMusicStore: (select: (s: unknown) => unknown) =>
    select({ ephemeral, dismiss: vi.fn(), markExpired: vi.fn() })
}))
vi.mock('./MusicMessage', () => ({ MaestroText: ({ text }: { text: string }) => <span>{text}</span> }))
vi.mock('./MaestroAvatar', () => ({ default: () => <i data-maestro /> }))

import { renderToStaticMarkup } from 'react-dom/server'
import MusicEphemeralList from './MusicEphemeralList'

describe('MusicEphemeralList', () => {
  const html = (): string =>
    renderToStaticMarkup(<MusicEphemeralList room="channel:c1" serverId="s1" />)

  it('"Só você vê esta mensagem" com o olho desenhado, sem emoji', () => {
    expect(html()).not.toContain('👁')
    expect(html()).toMatch(/<svg[^>]*aria-hidden="true"(?:(?!<\/svg>).)*<\/svg>Só você vê esta mensagem/)
  })

  it('resultados da busca com a lupa desenhada, sem emoji', () => {
    expect(html()).not.toContain('🔎')
    expect(html()).toMatch(/<svg[^>]*aria-hidden="true"(?:(?!<\/svg>).)*<\/svg>Resultados para &quot;lofi&quot;/)
    expect(html()).toContain('Lofi')
  })

  it('outra sala: nada', () => {
    expect(renderToStaticMarkup(<MusicEphemeralList room="channel:c2" serverId="s1" />)).toBe('')
  })
})
