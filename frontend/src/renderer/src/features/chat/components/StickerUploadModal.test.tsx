import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../shared/ui/Modal', () => ({
  default: ({ open, title, children }: { open: boolean; title: string; children: React.ReactNode }) =>
    open ? (
      <section>
        <h2>{title}</h2>
        {children}
      </section>
    ) : null
}))
vi.mock('../store/stickerStore', () => ({
  useStickerStore: (select: (s: unknown) => unknown) => select({ uploadSticker: vi.fn() })
}))

import { renderToStaticMarkup } from 'react-dom/server'
import StickerUploadModal from './StickerUploadModal'

describe('StickerUploadModal', () => {
  it('a área de escolher imagem mostra o ícone de imagem, não o emoji', () => {
    const html = renderToStaticMarkup(<StickerUploadModal open serverId="s1" onClose={() => {}} />)
    expect(html).toContain('Escolha ou arraste uma imagem')
    expect(html).not.toContain('🖼')
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"(?:(?!Escolha).)*Escolha ou arraste/)
  })

  it('fechado, nada', () => {
    expect(renderToStaticMarkup(<StickerUploadModal open={false} serverId="s1" onClose={() => {}} />)).toBe('')
  })
})
