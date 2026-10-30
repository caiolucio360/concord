import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ZoomControls from './ZoomControls'

const noop = (): void => {}
const render = (limit: 'min' | 'mid' | 'max'): string =>
  renderToStaticMarkup(<ZoomControls limit={limit} onZoomOut={noop} onZoomIn={noop} />)

describe('ZoomControls', () => {
  it('só os ícones de diminuir e aumentar, com rótulo para o leitor de tela', () => {
    const html = render('mid')
    expect(html.match(/<button/g)).toHaveLength(2)
    expect(html).toContain('aria-label="Diminuir zoom"')
    expect(html).toContain('aria-label="Aumentar zoom"')
    expect(html).not.toMatch(/>\d+%</)
    expect(html).not.toContain('aria-disabled="true"')
  })

  it('em 1x o diminuir fica desativado', () => {
    const html = render('min')
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(1)
    expect(html).toMatch(/aria-label="Diminuir zoom" aria-disabled="true"/)
  })

  it('em 5x o aumentar fica desativado', () => {
    const html = render('max')
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(1)
    expect(html).toMatch(/aria-label="Aumentar zoom" aria-disabled="true"/)
  })

  it('nas pontas os botões continuam focáveis (aria-disabled, não disabled)', () => {
    expect(render('min')).not.toContain('disabled=""')
  })

  it('botões de pelo menos 40 px (toque)', () => {
    expect(render('mid')).toMatch(/h-10[^"]* w-10/)
  })
})
