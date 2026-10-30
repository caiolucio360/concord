import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../app/router', () => ({
  default: { navigate: vi.fn(), state: { location: { pathname: '/' } } },
  router: { navigate: vi.fn(), state: { location: { pathname: '/' } } }
}))
vi.mock('../../call/lib/noiseSuppression', () => ({ openMicrophone: vi.fn() }))
vi.mock('../../call/lib/rtc', () => ({}))

import { replyPreview } from './MessageParts'
import type { Message, ReplyPreview } from '../api/messages'

describe('replyPreview', () => {
  it('retorna a prévia da mensagem original quando ela existe', () => {
    const originalComImagem: Message = {
      id: 'm1',
      author_id: 'u1',
      content: '',
      created_at: '2026-01-01T00:00:00Z',
      attachments: [
        { id: 'a1', kind: 'image', filename: 'foto.png', content_type: 'image/png', size_bytes: 10 }
      ]
    }
    expect(replyPreview(originalComImagem, null)).toEqual({ icon: 'image', text: 'Imagem' })

    const originalComTexto: Message = {
      id: 'm2',
      author_id: 'u1',
      content: 'Mensagem de texto',
      created_at: '2026-01-01T00:00:00Z'
    }
    expect(replyPreview(originalComTexto, null)).toEqual({ icon: null, text: 'Mensagem de texto' })
  })

  it('retorna o conteúdo de replyTo quando original não está disponível', () => {
    const replyTo: ReplyPreview = {
      id: 'm3',
      author_id: 'u2',
      content: 'Texto salvo na resposta'
    }
    expect(replyPreview(undefined, replyTo)).toEqual({ icon: null, text: 'Texto salvo na resposta' })
  })

  it('retorna vazio quando replyTo não tem conteúdo e original é indefinida', () => {
    const replyTo: ReplyPreview = {
      id: 'm4',
      author_id: 'u2',
      content: ''
    }
    expect(replyPreview(undefined, replyTo)).toEqual({ icon: null, text: '' })
    expect(replyPreview(undefined, null)).toEqual({ icon: null, text: '' })
    expect(replyPreview(undefined, undefined)).toEqual({ icon: null, text: '' })
  })
})
