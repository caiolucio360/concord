import { describe, expect, it } from 'vitest'
import { previewToText } from './previewEmoji'

describe('previewToText', () => {
  it('texto puro (notificação do SO): emoji do tipo antes do rótulo, como o backend', () => {
    expect(previewToText({ icon: 'image', text: 'Imagem' })).toBe('🖼️ Imagem')
    expect(previewToText({ icon: 'attachment', text: '2 anexos' })).toBe('📎 2 anexos')
    expect(previewToText({ icon: 'poll', text: 'Jantar?' })).toBe('📊 Jantar?')
  })

  it('só texto fica igual', () => {
    expect(previewToText({ icon: null, text: 'oi' })).toBe('oi')
  })
})
