import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// O chip de menção puxa o chatStore inteiro (e o áudio da call).
vi.mock('../../chat/components/MentionChip', () => ({ default: () => null }))

// O SSR do zustand lê o estado inicial: o store vira um objeto simples.
const state = vi.hoisted(() => ({ loaded: false, byId: {} as Record<string, unknown> }))
vi.mock('../store/emojiStore', () => ({
  useEmojiStore: <T,>(select: (s: typeof state) => T): T => select(state)
}))
vi.mock('../hooks/useCustomEmojis', () => ({ useCustomEmojis: () => {} }))

import CustomEmoji from './CustomEmoji'
import ReactionEmoji from './ReactionEmoji'
import MessageText from '../../chat/components/MessageText'
import { clearEmojiSrcs, primeEmojiSrc } from '../store/emojiSrc'
import type { CustomEmoji as Emoji } from '../api/emojis'

const ID = '3f2b6c1e-8a4d-4f7e-9b1a-2c3d4e5f6a7b'
const festa: Emoji = {
  id: ID,
  server_id: 's1',
  uploader_id: 'ana',
  name: 'festa',
  content_type: 'image/png',
  size_bytes: 10,
  created_at: ''
}

function loadWith(emojis: Emoji[]): void {
  state.loaded = true
  state.byId = Object.fromEntries(emojis.map((e) => [e.id, e]))
}

describe('CustomEmoji', () => {
  beforeEach(() => {
    state.loaded = false
    state.byId = {}
    clearEmojiSrcs()
  })

  it('membro vê a imagem com tamanho fixo, lazy e o :nome: como texto alternativo', () => {
    loadWith([festa])
    primeEmojiSrc(ID, 'https://x/emojis/a/file?token=t')
    const html = renderToStaticMarkup(<CustomEmoji id={ID} name="festa" />)
    expect(html).toContain('src="https://x/emojis/a/file?token=t"')
    expect(html).toContain('alt=":festa:"')
    expect(html).toContain('width="22"')
    expect(html).toContain('loading="lazy"')
  })

  it('quem não é membro (ou emoji apagado) vê :nome:', () => {
    loadWith([])
    expect(renderToStaticMarkup(<CustomEmoji id={ID} name="festa" />)).toBe(':festa:')
  })

  it('antes de carregar guarda o espaço sem mostrar o token', () => {
    const html = renderToStaticMarkup(<CustomEmoji id={ID} name="festa" size="jumbo" />)
    expect(html).toContain('role="img"')
    expect(html).toContain('h-12 w-12')
  })

  it('reação personalizada vira imagem de 20px; reação comum continua texto', () => {
    loadWith([festa])
    primeEmojiSrc(ID, 'u')
    expect(renderToStaticMarkup(<ReactionEmoji emoji={`<:${ID}>`} />)).toContain('width="20"')
    expect(renderToStaticMarkup(<ReactionEmoji emoji="🔥" />)).toBe('🔥')
  })

  it('mensagem só com emoji mostra grande; com texto, do tamanho da linha', () => {
    loadWith([festa])
    primeEmojiSrc(ID, 'u')
    const only = renderToStaticMarkup(<MessageText content={`<:festa:${ID}>`} everyone={null} />)
    expect(only).toContain('width="48"')
    const mixed = renderToStaticMarkup(<MessageText content={`oi <:festa:${ID}>`} everyone={null} />)
    expect(mixed).toContain('width="22"')
    expect(mixed).toContain('oi ')
  })
})
