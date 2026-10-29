import { formatMemberSince } from './memberSince'

describe('formatMemberSince', () => {
  it('sem data ou data inválida, null', () => {
    expect(formatMemberSince(undefined)).toBeNull()
    expect(formatMemberSince('lixo')).toBeNull()
  })
  it('data válida vira dia, mês curto e ano em português', () => {
    expect(formatMemberSince('2026-10-25T12:00:00Z')).toMatch(/25.*out.*2026/)
  })
})
