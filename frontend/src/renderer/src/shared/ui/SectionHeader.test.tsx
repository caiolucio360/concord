import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import SectionHeader from './SectionHeader'
import { StarIcon } from './icons'

describe('SectionHeader', () => {
  it('um estilo só: 12 px, semibold, maiúsculas, cor apagada; h3 por padrão', () => {
    const html = renderToStaticMarkup(<SectionHeader>Favoritos</SectionHeader>)
    expect(html).toMatch(/^<h3 class="[^"]*">Favoritos<\/h3>$/)
    for (const cls of ['text-ds-xs', 'font-semibold', 'uppercase', 'tracking-wide', 'text-muted']) {
      expect(html).toContain(cls)
    }
    expect(html).not.toMatch(/text-\[\d+px\]/)
  })

  it('troca a tag, aceita id e classe de espaçamento', () => {
    const html = renderToStaticMarkup(
      <SectionHeader as="p" id="t" className="mb-2">
        Voz
      </SectionHeader>
    )
    expect(html).toMatch(/^<p id="t" class="[^"]* mb-2">Voz<\/p>$/)
  })

  it('ícone de 12 px antes do texto e a contagem depois do travessão', () => {
    const html = renderToStaticMarkup(
      <SectionHeader icon={StarIcon} count={3}>
        Online
      </SectionHeader>
    )
    expect(html).toMatch(/<svg[^>]*width="12"[^>]*aria-hidden="true".*<\/svg>Online — 3<\/h3>$/)
  })
})
