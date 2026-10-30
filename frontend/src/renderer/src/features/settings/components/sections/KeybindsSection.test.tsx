import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.stubGlobal('window', {})

import { KeybindsSection } from './KeybindsSection'

describe('KeybindsSection', () => {
  it('cada atalho tem tirar (X) e voltar ao padrão (desfazer) como ícones, com rótulo', () => {
    const html = renderToStaticMarkup(<KeybindsSection />)
    expect(html).toContain('Atalhos')
    expect(html).toMatch(/aria-label="Tirar o atalho de &quot;[^"]+&quot;"/)
    expect(html).toMatch(/aria-label="Voltar ao padrão: &quot;[^"]+&quot;"/)
    expect(html).not.toContain('✕')
    expect(html).not.toContain('↺')
    expect(html).toMatch(/aria-label="Tirar o atalho[^>]*><svg/)
    expect(html).toMatch(/aria-label="Voltar ao padrão[^>]*><svg/)
  })
})
