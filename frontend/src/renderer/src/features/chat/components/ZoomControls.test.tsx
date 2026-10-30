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
    expect(html).toContain('aria-label="Aumentar zoom"')
    expect(html).not.toContain('aria-disabled="true"')
  })

  it('o leitor de tela lê o nível e a ação do botão do meio', () => {
    expect(render('mid')).toMatch(
      /<span>100%<\/span><span class="sr-only">, voltar ao tamanho original<\/span>/
    )
  })

  it('nas pontas os botões continuam focáveis (aria-disabled, não disabled)', () => {
    expect(render('min')).not.toContain('disabled=""')
  })

  it('em 1x o diminuir e o voltar ficam desativados', () => {
    const html = render('min')
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(2)
    expect(html).toMatch(/aria-label="Diminuir zoom" aria-disabled="true"/)
  })

  it('em 5x o aumentar fica desativado', () => {
    const html = render('max')
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(1)
    expect(html).toMatch(/aria-label="Aumentar zoom" aria-disabled="true"/)
  })

  it('botões de pelo menos 40 px (toque)', () => {
    expect(render('mid')).toMatch(/h-10[^"]* w-10/)
  })
})
