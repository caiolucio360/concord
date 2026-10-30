import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import PreviewText from './PreviewText'
import type { PreviewKind } from '../lib/preview'

const KINDS: PreviewKind[] = ['image', 'video', 'audio', 'attachment', 'sticker', 'gif', 'poll']

describe('PreviewText', () => {
  it('só texto: o texto cortado, sem ícone', () => {
    const html = renderToStaticMarkup(<PreviewText preview={{ icon: null, text: 'oi' }} className="x" />)
    expect(html).toBe('<span class="truncate x">oi</span>')
  })

  it('com tipo: o ícone desenhado antes do rótulo, cada tipo com o seu', () => {
    const icons = KINDS.map((icon) => {
      const html = renderToStaticMarkup(<PreviewText preview={{ icon, text: 'Rótulo' }} />)
      expect(html).toMatch(/^<span[^>]*><svg[^>]*aria-hidden="true".*<\/svg><span class="truncate">Rótulo<\/span><\/span>$/)
      return html.match(/<svg.*<\/svg>/)![0]
    })
    expect(new Set(icons).size).toBe(KINDS.length)
  })
})
