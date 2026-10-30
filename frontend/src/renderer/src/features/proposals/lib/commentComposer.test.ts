import { describe, expect, it } from 'vitest'
import { commentButtonLabel, commentPlaceholder } from './commentComposer'

describe('commentButtonLabel', () => {
  it('arquivos subindo têm prioridade, depois o envio', () => {
    expect(commentButtonLabel(true, true)).toBe('Enviando arquivos…')
    expect(commentButtonLabel(false, true)).toBe('Enviando…')
    expect(commentButtonLabel(false, false)).toBe('Comentar')
  })
})

describe('commentPlaceholder', () => {
  it('respondendo cita a pessoa; senão ensina o @', () => {
    expect(commentPlaceholder({ author_name: 'ana' })).toBe('Responder a @ana…')
    expect(commentPlaceholder(null)).toBe('Comente, ou use @ para marcar alguém')
  })
})
