import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ProposalComment } from '../api/proposals'
import CommentReplyBar from './CommentReplyBar'

const comment = (over: Partial<ProposalComment>): ProposalComment =>
  ({ id: 'c1', author_name: 'Ana', body: 'olá', attachments: [], ...over }) as ProposalComment

describe('CommentReplyBar', () => {
  it('sem resposta, nada', () => {
    expect(renderToStaticMarkup(<CommentReplyBar replyingTo={null} onCancel={() => {}} />)).toBe('')
  })

  it('comentário só com anexo: clipe desenhado e o rótulo, sem emoji', () => {
    const att = { id: 'a', kind: 'image' } as ProposalComment['attachments'][number]
    const html = renderToStaticMarkup(
      <CommentReplyBar replyingTo={comment({ body: '', attachments: [att, att] })} onCancel={() => {}} />
    )
    expect(html).toContain('@Ana')
    expect(html).not.toContain('📎')
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"(?:(?!<\/svg>).)*<\/svg><span class="truncate">2 anexos<\/span>/)
  })
})
