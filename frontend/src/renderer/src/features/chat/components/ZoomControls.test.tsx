import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ZoomControls from './ZoomControls'

const noop = (): void => {}
const render = (limit: 'min' | 'mid' | 'max'): string =>
  renderToStaticMarkup(
    <ZoomControls
      limit={limit}
      levelRef={{ current: null }}
      onZoomOut={noop}
      onZoomIn={noop}
      onReset={noop}
    />
  )

describe('ZoomControls', () => {
  it('tem diminuir, nível (volta ao tamanho original) e aumentar, com rótulo', () => {
    const html = render('mid')
    expect(html).toContain('aria-label="Diminuir zoom"')
    expect(html).toContain('aria-label="Voltar ao tamanho original"')
    expect(html).toContain('aria-label="Aumentar zoom"')
    expect(html).toContain('100%')
    expect(html).not.toContain('disabled=""')
  })

  it('em 1x o diminuir e o voltar ficam desativados', () => {
    const html = render('min')
    expect(html.match(/disabled=""/g)).toHaveLength(2)
    expect(html).toMatch(
      /aria-label="Diminuir zoom"[^>]*disabled=""|disabled=""[^>]*aria-label="Diminuir zoom"/
    )
  })

  it('em 5x o aumentar fica desativado', () => {
    const html = render('max')
    expect(html.match(/disabled=""/g)).toHaveLength(1)
    expect(html).toMatch(
      /aria-label="Aumentar zoom"[^>]*disabled=""|disabled=""[^>]*aria-label="Aumentar zoom"/
    )
  })

  it('botões de pelo menos 40 px (toque)', () => {
    expect(render('mid')).toMatch(/h-10[^"]* w-10/)
  })
})
