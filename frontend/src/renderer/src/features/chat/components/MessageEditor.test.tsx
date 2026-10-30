import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import MessageEditor from './MessageEditor'

describe('MessageEditor', () => {
  it('dica de teclado separada por ·, sem •', () => {
    const html = renderToStaticMarkup(
      <MessageEditor initial="oi" saving={false} onSave={() => {}} onCancel={() => {}} />
    )
    expect(html).not.toContain('•')
    expect(html).toMatch(/cancelar<\/button> · Enter para/)
  })
})
