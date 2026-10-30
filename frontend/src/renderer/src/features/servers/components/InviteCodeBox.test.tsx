import { describe, expect, it, vi } from 'vitest'

vi.mock('../api/servers', () => ({
  getInviteCode: vi.fn(() => new Promise(() => {})),
  rotateInviteCode: vi.fn()
}))
vi.mock('../../friends/components/ConfirmModal', () => ({ default: () => null }))
// No SSR o Zustand lê o estado inicial: o código vem do mock.
const codes: Record<string, string> = { s1: 'abc123' }
vi.mock('../store/inviteCodeStore', () => ({
  useInviteCodeStore: Object.assign(
    (select: (s: { codes: Record<string, string> }) => unknown) => select({ codes }),
    { getState: () => ({ set: vi.fn() }) }
  )
}))

import { renderToStaticMarkup } from 'react-dom/server'
import InviteCodeBox from './InviteCodeBox'

describe('InviteCodeBox', () => {
  it('com o código: o link e o caminho "+ › Entrar com código" com seta desenhada', () => {
    const html = renderToStaticMarkup(<InviteCodeBox serverId="s1" />)
    expect(html).toContain('abc123')
    expect(html).not.toContain('→')
    expect(html).toMatch(/<strong>\+<\/strong> ?<svg[^>]*aria-hidden="true"(?:(?!<\/svg>).)*<\/svg> ?<strong>Entrar com código<\/strong>/)
  })

  it('sem o código ainda: o campo fica carregando', () => {
    const html = renderToStaticMarkup(<InviteCodeBox serverId="s2" />)
    expect(html).toContain('Gerando link…')
  })
})
