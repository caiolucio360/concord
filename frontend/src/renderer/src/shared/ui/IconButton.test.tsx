import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import IconButton from './IconButton'
import CloseButton from './CloseButton'
import { TrashIcon } from './icons'

const html = (el: React.JSX.Element): string => renderToStaticMarkup(el)
const svgSize = (out: string): string | undefined => /<svg[^>]*width="(\d+)"/.exec(out)?.[1]

describe('IconButton', () => {
  it('rótulo vira aria-label e dica; o ícone fica escondido do leitor de tela', () => {
    const out = html(<IconButton icon={TrashIcon} label="Apagar" />)
    expect(out).toContain('type="button"')
    expect(out).toContain('aria-label="Apagar"')
    expect(out).toContain('title="Apagar"')
    expect(out).toMatch(/<svg[^>]*aria-hidden="true"/)
    expect(out).toContain('focus-ring')
  })

  it('title próprio substitui a dica (ex.: com o atalho)', () => {
    const out = html(<IconButton icon={TrashIcon} label="Apagar" title="Apagar (Del)" />)
    expect(out).toContain('title="Apagar (Del)"')
    expect(out).toContain('aria-label="Apagar"')
  })

  it('tamanho define a caixa e o ícone: xs 12, sm 16, md 20, lg 24', () => {
    expect(svgSize(html(<IconButton icon={TrashIcon} label="x" size="xs" />))).toBe('12')
    expect(svgSize(html(<IconButton icon={TrashIcon} label="x" size="sm" />))).toBe('16')
    expect(svgSize(html(<IconButton icon={TrashIcon} label="x" />))).toBe('20')
    expect(svgSize(html(<IconButton icon={TrashIcon} label="x" size="lg" />))).toBe('24')
    expect(html(<IconButton icon={TrashIcon} label="x" size="sm" />)).toContain('size-8')
    expect(html(<IconButton icon={TrashIcon} label="x" />)).toContain('size-10 sm:size-8')
    expect(html(<IconButton icon={TrashIcon} label="x" size="lg" />)).toContain('size-11')
  })

  it('variantes sem cor crua; media serve por cima de imagem em qualquer tema', () => {
    for (const variant of ['ghost', 'filled', 'danger', 'media'] as const) {
      expect(html(<IconButton icon={TrashIcon} label="x" variant={variant} />)).not.toMatch(
        /\b(gray|red|emerald|violet|amber)-\d/
      )
    }
    expect(html(<IconButton icon={TrashIcon} label="x" variant="media" />)).toContain('on-media')
  })

  it('repassa disabled, onClick e className', () => {
    const out = html(<IconButton icon={TrashIcon} label="x" disabled className="ml-auto" />)
    expect(out).toContain('disabled=""')
    expect(out).toContain('ml-auto')
  })
})

describe('CloseButton', () => {
  it('é o X com o rótulo "Fechar"', () => {
    const out = html(<CloseButton />)
    expect(out).toContain('aria-label="Fechar"')
    expect(out).toContain('<path d="M18 6 6 18M6 6l12 12"')
  })

  it('aceita outro rótulo (dispensar aviso, remover anexo)', () => {
    expect(html(<CloseButton label="Remover anexo" size="xs" variant="media" />)).toContain(
      'aria-label="Remover anexo"'
    )
  })
})
