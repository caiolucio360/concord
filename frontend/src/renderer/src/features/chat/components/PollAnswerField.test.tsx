import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// Sem portal no SSR: o modal aberto vira um bloco com o título.
vi.mock('../../../shared/ui/Modal', () => ({
  default: ({ open, title, children }: { open: boolean; title?: string; children: React.ReactNode }) =>
    open ? <div data-modal={title}>{children}</div> : null
}))

import CreatePollModal from './CreatePollModal'
import { PollAnswerField } from './PollAnswerField'

const noop = (): void => {}
const field = {
  index: 2,
  pickerOpen: false,
  onTogglePicker: noop,
  onClosePicker: noop,
  onChange: noop,
  onRemove: noop
}

describe('CreatePollModal', () => {
  it('abre com a pergunta, duas respostas e sem remover (é o mínimo)', () => {
    const html = renderToStaticMarkup(<CreatePollModal open onClose={noop} onCreate={async () => {}} />)
    expect(html).toContain('data-modal="Criar enquete"')
    expect(html).toContain('placeholder="Resposta 2"')
    expect(html).not.toContain('Remover resposta')
    expect(html).toContain('Adicionar outra resposta')
  })
})

describe('PollAnswerField', () => {
  it('sem emoji: carinha; acima do mínimo: remover com rótulo', () => {
    const html = renderToStaticMarkup(
      <PollAnswerField {...field} answer={{ text: 'Pizza', emoji: '', image_url: '' }} removable />
    )
    expect(html).toContain('placeholder="Resposta 3"')
    expect(html).not.toContain('🙂')
    expect(html).toMatch(/aria-label="Emoji ou imagem da resposta 3"[^>]*><svg/)
    expect(html).toContain('aria-label="Remover resposta 3"')
    expect(html).not.toContain('✕')
    expect(html).toMatch(/aria-label="Remover resposta 3"[^>]*><svg/)
  })

  it('com emoji e seletor aberto: mostra o emoji e a opção de tirar', () => {
    const html = renderToStaticMarkup(
      <PollAnswerField {...field} pickerOpen removable={false} answer={{ text: '', emoji: '🍕', image_url: '' }} />
    )
    expect(html).toContain('🍕')
    expect(html).toContain('Remover emoji/imagem')
    expect(html).not.toContain('Remover resposta')
  })
})
