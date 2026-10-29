import { describe, expect, it, vi } from 'vitest'

vi.mock('react-dom', async (original) => ({
  ...(await original<typeof import('react-dom')>()),
  createPortal: (node: React.ReactNode) => node
}))

import { renderToStaticMarkup } from 'react-dom/server'
import MediaLightbox from './MediaLightbox'

describe('MediaLightbox', () => {
  it('abre a imagem inteira, sem zoom, pronta para ampliar', () => {
    vi.stubGlobal('document', { body: {} })
    const html = renderToStaticMarkup(
      <MediaLightbox src="blob:foto" alt="foto.png" onClose={() => {}} />
    )

    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-label="foto.png"')
    expect(html).toContain('transform:translate(0px, 0px) scale(1)')
    expect(html).toContain('cursor-zoom-in')
    // Sem isso o navegador do celular faz o próprio zoom/rolagem em vez da pinça na imagem.
    expect(html).toContain('touch-none')
  })

  it('mostra a barra de zoom em 100%, com o diminuir desativado', () => {
    vi.stubGlobal('document', { body: {} })
    const html = renderToStaticMarkup(
      <MediaLightbox src="blob:foto" alt="foto.png" onClose={() => {}} />
    )

    expect(html).toContain('aria-label="Aumentar zoom"')
    expect(html).toContain('100%')
    expect(html.match(/disabled=""/g)).toHaveLength(2)
  })
})
