import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// O botão de gravar puxa o microfone; aqui só importa o campo.
vi.mock('../../chat/components/VoiceRecordButton', () => ({ default: () => <span data-voice /> }))

import type { ProposalComment } from '../api/proposals'
import CommentComposer from './CommentComposer'
import CommentReplyBar from './CommentReplyBar'
import MentionSuggestionList from './MentionSuggestionList'

const reply = { id: 'c1', author_name: 'ana', body: 'boa ideia' } as ProposalComment
const noop = (): void => {}

describe('CommentComposer', () => {
  it('sem resposta: dica do @, contador e Comentar travado', () => {
    const html = renderToStaticMarkup(<CommentComposer proposalId="p1" replyingTo={null} onCancelReply={noop} />)
    expect(html).toContain('placeholder="Comente, ou use @ para marcar alguém"')
    expect(html).toContain('0/')
    expect(html).toMatch(/disabled=""[^>]*>Comentar</)
    expect(html).not.toContain('data-reply-bar')
  })

  it('respondendo: barra com o autor e a prévia, e a dica cita a pessoa', () => {
    const html = renderToStaticMarkup(<CommentComposer proposalId="p1" replyingTo={reply} onCancelReply={noop} />)
    expect(html).toContain('data-reply-bar')
    expect(html).toContain('placeholder="Responder a @ana…"')
  })
})

describe('CommentReplyBar', () => {
  it('sem resposta, nada; com resposta, cancelar com rótulo', () => {
    expect(renderToStaticMarkup(<CommentReplyBar replyingTo={null} onCancel={noop} />)).toBe('')
    const html = renderToStaticMarkup(<CommentReplyBar replyingTo={reply} onCancel={noop} />)
    expect(html).toContain('boa ideia')
    expect(html).toContain('aria-label="Cancelar resposta"')
    expect(html).toContain('title="Cancelar resposta (Esc)"')
    expect(html).not.toContain('✕')
    expect(html).toContain('<svg')
  })
})

describe('MentionSuggestionList', () => {
  it('vazia, nada; com nomes, destaca o escolhido', () => {
    expect(renderToStaticMarkup(<MentionSuggestionList suggestions={[]} highlight={0} onPick={noop} onHighlight={noop} />)).toBe('')
    const html = renderToStaticMarkup(
      <MentionSuggestionList
        suggestions={[
          { username: 'ana', display_name: 'Ana' },
          { username: 'bia', display_name: 'Bia' }
        ]}
        highlight={1}
        onPick={noop}
        onHighlight={noop}
      />
    )
    expect(html).toMatch(/aria-selected="true"[^>]*>.*Bia/)
  })
})
