import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { CustomEmoji as Emoji, ServerEmojis } from '../api/emojis'

// O SSR do zustand lê o estado inicial: stores viram objetos simples.
const state = vi.hoisted(() => ({
  emoji: { loaded: true, groups: [] as unknown[], byId: {} as Record<string, unknown>, base: null as unknown, remove: () => Promise.resolve() },
  me: 'ana',
  openServer: 's1' as string | undefined,
  perms: new Set<string>()
}))
vi.mock('../store/emojiStore', () => ({
  useEmojiStore: Object.assign(<T,>(select: (s: typeof state.emoji) => T): T => select(state.emoji), {
    getState: () => ({ ensureBase: () => Promise.resolve() })
  })
}))
vi.mock('../hooks/useCustomEmojis', () => ({ useCustomEmojis: () => {} }))
vi.mock('../../../shared/ui/Modal', () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h2>{title}</h2>
      {children}
    </div>
  )
}))
vi.mock('../../auth/store/authStore', () => ({
  useAuthStore: <T,>(select: (s: { user: { id: string } }) => T): T => select({ user: { id: state.me } })
}))
vi.mock('../../servers/store/serverStore', () => ({
  useServerStore: <T,>(select: (s: { currentServer?: { id: string } }) => T): T =>
    select({ currentServer: state.openServer ? { id: state.openServer } : undefined })
}))
vi.mock('../../servers/hooks/useServerAccess', () => ({
  useServerAccess: () => ({ can: (bit: number) => state.perms.has(String(bit)) })
}))

import EmojiPickerGrid, { filterGroups } from './EmojiPickerGrid'
import EmojisTab from '../../chat/components/EmojisTab'
import EmojiUploadModal from './EmojiUploadModal'
import { Perm } from '../../servers/lib/permissions'

const emoji = (id: string, name: string, server = 's1', uploader = 'bia'): Emoji => ({
  id,
  server_id: server,
  uploader_id: uploader,
  name,
  content_type: 'image/png',
  size_bytes: 1,
  created_at: ''
})
const groups: ServerEmojis[] = [
  { server_id: 's1', server_name: 'Alfa', emojis: [emoji('e1', 'festa'), emoji('e2', 'kkk', 's1', 'ana')] },
  { server_id: 's2', server_name: 'Beta', server_icon_url: null, emojis: [emoji('e3', 'gato', 's2')] }
]

beforeEach(() => {
  state.emoji.groups = groups
  state.emoji.byId = Object.fromEntries(groups.flatMap((g) => g.emojis).map((e) => [e.id, e]))
  state.emoji.base = null
  state.openServer = 's1'
  state.perms = new Set()
  vi.stubGlobal('document', { body: {} })
})

describe('filterGroups', () => {
  it('filtra pelo nome sem acento e some com servidor sem resultado', () => {
    expect(filterGroups(groups, 'GATO').map((g) => g.server_name)).toEqual(['Beta'])
    expect(filterGroups(groups, '')).toBe(groups)
  })
})

describe('EmojiPickerGrid', () => {
  it('uma seção por servidor (com nome) antes do pack base', () => {
    const html = renderToStaticMarkup(<EmojiPickerGrid search="" mode="message" onPick={() => {}} />)
    expect(html.indexOf('Alfa')).toBeLessThan(html.indexOf('Beta'))
    expect(html.indexOf('Beta')).toBeLessThan(html.indexOf('Frequentes'))
    expect(html).toContain('aria-label=":festa:"')
  })

  it('busca sem nada achado mostra o aviso', () => {
    const html = renderToStaticMarkup(<EmojiPickerGrid search="zzzz" mode="reaction" onPick={() => {}} />)
    expect(html).toContain('Nenhum emote encontrado')
  })

  it('categorias depois das primeiras ficam só com o espaço reservado', () => {
    state.emoji.base = [1, 2, 3].map((n) => ({ id: `c${n}`, name: `cat${n}`, items: [{ emoji: `${n}️⃣`, label: `n${n}`, keywords: [] }] }))
    const html = renderToStaticMarkup(<EmojiPickerGrid search="" mode="message" onPick={() => {}} />)
    expect(html).toContain('cat2')
    expect(html).not.toContain('cat3')
    expect(html).toContain('height:56px')
  })
})

describe('EmojisTab', () => {
  it('no servidor aberto mostra o contador e, com permissão, o Novo emoji', () => {
    expect(renderToStaticMarkup(<EmojisTab serverId="s1" search="" onSelect={() => {}} onAdd={() => {}} />)).toContain(
      '2 / 50 emojis'
    )
    expect(renderToStaticMarkup(<EmojisTab serverId="s1" search="" onSelect={() => {}} onAdd={() => {}} />)).not.toContain(
      'Novo emoji'
    )
    state.perms.add(String(Perm.ADD_EMOJIS))
    expect(renderToStaticMarkup(<EmojisTab serverId="s1" search="" onSelect={() => {}} onAdd={() => {}} />)).toContain(
      'Novo emoji'
    )
  })

  it('em DM não tem contador; a lixeira aparece só no que pode apagar', () => {
    const html = renderToStaticMarkup(<EmojisTab search="" onSelect={() => {}} onAdd={() => {}} />)
    expect(html).not.toContain('/ 50 emojis')
    expect(html.match(/Excluir emoji/g)?.length).toBe(2) // title + aria-label do kkk (da ana)
    state.perms.add(String(Perm.MANAGE_EXPRESSIONS))
    const mod = renderToStaticMarkup(<EmojisTab serverId="s1" search="" onSelect={() => {}} onAdd={() => {}} />)
    expect(mod.match(/title="Excluir emoji"/g)?.length).toBe(2) // os dois do Alfa
  })
})

describe('EmojiUploadModal', () => {
  it('mostra os textos aprovados e começa com Enviar desligado', () => {
    const html = renderToStaticMarkup(<EmojiUploadModal serverId="s1" onClose={() => {}} />)
    expect(html).toContain('Novo emoji')
    expect(html).toContain('PNG, JPEG, WEBP, AVIF ou GIF, até 256 KB. O ideal é 128×128.')
    expect(html).toContain('placeholder="nome_do_emoji"')
    expect(html).toMatch(/disabled=""[^>]*>Enviar|>Enviar<\/button>/)
  })
})
