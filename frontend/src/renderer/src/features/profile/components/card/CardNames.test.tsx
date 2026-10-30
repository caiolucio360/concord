import { describe, expect, it, vi } from 'vitest'

vi.mock('../StyledName', () => ({ default: ({ name }: { name: string }) => <b>{name}</b> }))

import { renderToStaticMarkup } from 'react-dom/server'
import type { CardProfile } from '../ProfileCardBody'
import CardNames from './CardNames'

const profile = { id: 'u1', username: 'ana', display_name: 'Ana', pronouns: 'ela/dela' } as CardProfile

describe('CardNames', () => {
  it('usuário e pronomes separados por ·, sem •', () => {
    const html = renderToStaticMarkup(<CardNames profile={profile} you={false} />)
    expect(html).not.toContain('•')
    expect(html).toMatch(/<span>ana<\/span><span[^>]*> · <\/span><span[^>]*>ela\/dela/)
  })
})
