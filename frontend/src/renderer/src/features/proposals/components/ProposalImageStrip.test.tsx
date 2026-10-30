import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import ProposalImageStrip from './ProposalImageStrip'

const noop = (): void => {}

describe('ProposalImageStrip', () => {
  it('sem imagens, nada', () => {
    expect(renderToStaticMarkup(<ProposalImageStrip drafts={[]} onRemove={noop} />)).toBe('')
  })

  it('subindo mostra a barra; com erro, a mensagem; remover é o X desenhado', () => {
    const html = renderToStaticMarkup(
      <ProposalImageStrip
        drafts={[
          { key: 'a', id: null, previewUrl: 'blob:a', progress: 0.25 },
          { key: 'b', id: null, previewUrl: 'blob:b', progress: 0, error: 'Grande demais' }
        ]}
        onRemove={noop}
      />
    )
    expect(html).toContain('width:25%')
    expect(html).toContain('Grande demais')
    expect(html.match(/aria-label="Remover imagem"/g)).toHaveLength(2)
    expect(html).not.toContain('✕')
    expect(html).toContain('<svg')
  })
})
