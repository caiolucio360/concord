import type { User } from '../../auth/store/authStore'
import { draftFromProfile } from '../../profile/lib/profileValidation'
import { previewProfile } from './profilePreview'

const user: User = { id: 'u1', username: 'ana', display_name: 'Ana', email: 'a@b.co', bio: 'oi', avatar_url: '/api/profile-media/x' }

describe('previewProfile', () => {
  it('põe o rascunho por cima da conta, mantendo o resto (id, avatar)', () => {
    const draft = { ...draftFromProfile(user), display_name: 'Ana Maria', bio: 'nova bio', pronouns: 'ela' }
    expect(previewProfile(user, draft)).toMatchObject({ id: 'u1', avatar_url: '/api/profile-media/x', display_name: 'Ana Maria', bio: 'nova bio', pronouns: 'ela' })
  })

  it('nome em branco mostra o @; links vazios somem e os outros são normalizados', () => {
    const draft = { ...draftFromProfile(user), display_name: '   ', links: ['github.com/ana', '  ', ''] }
    const p = previewProfile(user, draft)
    expect(p.display_name).toBe('ana')
    expect(p.links).toEqual([{ url: 'https://github.com/ana' }])
  })
})
