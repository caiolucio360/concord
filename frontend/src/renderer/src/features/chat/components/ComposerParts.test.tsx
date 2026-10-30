import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// Peças pesadas que o arquivo importa (microfone, seletor de mídia).
vi.mock('./VoiceRecordButton', () => ({ default: () => null }))
vi.mock('./UnifiedMediaPickerPopover', () => ({ default: () => null }))

import type { Message } from '../api/messages'
import { ReplyBar } from './ComposerParts'

const msg = { id: 'm1', content: 'bom dia' } as Message

describe('ReplyBar', () => {
  it('sem resposta, nada', () => {
    expect(renderToStaticMarkup(<ReplyBar replyingTo={null} authorName="ana" onCancel={() => {}} />)).toBe('')
  })

  it('cancelar é o X desenhado, com rótulo e a dica do Esc', () => {
    const html = renderToStaticMarkup(<ReplyBar replyingTo={msg} authorName="ana" onCancel={() => {}} />)
    expect(html).toContain('@ana')
    expect(html).toContain('aria-label="Cancelar resposta"')
    expect(html).toContain('title="Cancelar resposta (Esc)"')
    expect(html).not.toContain('✕')
    expect(html).toContain('<svg')
  })
})
