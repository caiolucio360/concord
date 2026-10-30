import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { PinnedMessage } from '../api/messages'
import PinnedMessageBar from './PinnedMessageBar'

const pin = (over: Partial<PinnedMessage> = {}): PinnedMessage =>
  ({
    id: 'm1',
    author_id: 'u1',
    author: { id: 'u1', username: 'ana', display_name: 'Ana' },
    content: 'combinado',
    attachments: [],
    ...over
  }) as unknown as PinnedMessage

const render = (pins: PinnedMessage[]): string =>
  renderToStaticMarkup(<PinnedMessageBar pins={pins} nicknames={undefined} onJump={() => {}} />)

describe('PinnedMessageBar', () => {
  it('sem fixadas, nada', () => {
    expect(render([])).toBe('')
  })

  it('autor, texto e "Ir para mensagem" com o chevron desenhado, sem →', () => {
    const html = render([pin(), pin({ id: 'm2' })])
    expect(html).toContain('Ana:')
    expect(html).toContain('combinado')
    expect(html).toContain('+1 fixada')
    expect(html).not.toContain('→')
    expect(html).toMatch(/Ir para mensagem<svg[^>]*aria-hidden="true"/)
  })

  it('fixada só com imagem: ícone desenhado e "Imagem", sem emoji', () => {
    const html = render([pin({ content: '', attachments: [{ kind: 'image' }] } as Partial<PinnedMessage>)])
    expect(html).not.toMatch(/📷|🖼/)
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"(?:(?!<\/svg>).)*<\/svg><span class="truncate">Imagem<\/span>/)
  })
})
