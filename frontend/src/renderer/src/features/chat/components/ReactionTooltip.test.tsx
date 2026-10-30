import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// Portal e stores fora do SSR: o popover vira HTML simples.
vi.mock('react-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-dom')>()),
  createPortal: (node: React.ReactNode) => node
}))
const { pick } = vi.hoisted(() => ({
  pick:
    <S,>(state: S) =>
    <T,>(select: (s: S) => T): T =>
      select(state)
}))
vi.mock('../../profile/store/profileStore', () => ({
  useProfileStore: pick({ profiles: {}, fetchProfile: () => Promise.resolve() })
}))
vi.mock('../../servers/store/serverStore', () => ({ useServerStore: pick({ currentMembers: [] }) }))
vi.mock('../../friends/store/friendStore', () => ({ useFriendStore: pick({ friends: [] }) }))
vi.mock('../store/chatStore', () => ({ useChatStore: pick({ conversations: [] }) }))
vi.mock('../../auth/store/authStore', () => ({
  useAuthStore: pick({ user: { id: 'ana', username: 'ana', display_name: 'Ana' } })
}))
vi.mock('../../servers/hooks/useServerNames', () => ({ useServerNicknames: () => ({}) }))
vi.mock('../../emojis/store/emojiStore', () => ({
  useEmojiStore: pick({ loaded: true, byId: { 'e-1': { id: 'e-1', name: 'festa' } } })
}))
vi.mock('../../emojis/hooks/useCustomEmojis', () => ({ useCustomEmojis: () => {} }))
vi.mock('../../../shared/ui/Avatar', () => ({ default: () => null }))

import ReactionTooltip from './ReactionTooltip'

const ID = '3f2b6c1e-8a4d-4f7e-9b1a-2c3d4e5f6a7b'

function render(emoji: string, top: number): string {
  vi.stubGlobal('window', { innerHeight: 800, innerWidth: 1200 })
  vi.stubGlobal('document', { body: {} })
  const anchor = {
    getBoundingClientRect: () => ({ top, bottom: top + 28, left: 100, width: 40 })
  } as unknown as HTMLElement
  return renderToStaticMarkup(
    <ReactionTooltip
      emoji={emoji}
      userIds={['ana']}
      anchor={anchor}
      meId="ana"
      onClose={() => {}}
      onMouseEnter={() => {}}
      onMouseLeave={() => {}}
    />
  )
}

describe('ReactionTooltip', () => {
  it('emoji comum: o próprio emoji no rótulo e a contagem', () => {
    const html = render('🔥', 400)
    expect(html).toContain('aria-label="Quem reagiu com 🔥"')
    expect(html).toContain('1 reação')
    expect(html).toContain('bottom:') // abre acima do chip
  })

  it('emoji personalizado: :nome: no rótulo; perto do topo abre para baixo', () => {
    const html = render(`<:${ID}>`, 20)
    expect(html).toContain('Quem reagiu com :emoji:')
    expect(html).toContain('top:')
  })
})
