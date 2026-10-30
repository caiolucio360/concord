import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../servers/store/serverStore', () => ({
  useServerStore: (select: (s: unknown) => unknown) =>
    select({ kickMember: vi.fn(), banMember: vi.fn(), setMemberNickname: vi.fn() })
}))
// No SSR o Zustand lê o estado inicial: o pedido vem do mock.
const mod = vi.hoisted(() => ({ ban: null as null | { serverId: string; userId: string; name: string } }))
vi.mock('../store/moderationStore', () => ({
  useModerationStore: (select: (s: unknown) => unknown) =>
    select({ kick: null, ban: mod.ban, nickname: null, closeKick: vi.fn(), closeBan: vi.fn(), closeNickname: vi.fn() })
}))
vi.mock('../../friends/components/ConfirmModal', () => ({ default: () => null }))
vi.mock('../../../shared/ui/Modal', () => ({
  default: ({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) =>
    open ? (
      <section>
        <h2>{title}</h2>
        {children}
      </section>
    ) : null
}))

import { renderToStaticMarkup } from 'react-dom/server'
import ModerationHost from './ModerationHost'

describe('ModerationHost', () => {
  beforeEach(() => {
    mod.ban = null
  })

  it('banir: explica onde desbanir com a seta desenhada, sem →', () => {
    mod.ban = { serverId: 's1', userId: 'u2', name: 'Bia' }
    const html = renderToStaticMarkup(<ModerationHost />)
    expect(html).toContain('Banir Bia')
    expect(html).not.toContain('→')
    expect(html).toMatch(/Configurações do servidor ?<svg[^>]*aria-hidden="true"(?:(?!<\/svg>).)*<\/svg> ?Banimentos/)
  })

  it('sem nada pedido, nenhum modal', () => {
    expect(renderToStaticMarkup(<ModerationHost />)).toBe('')
  })
})
