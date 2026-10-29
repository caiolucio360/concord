import { request } from '../../../shared/api/client'
import type { User } from '../../auth/store/authStore'
import type { ProfileFields } from '../lib/profileValidation'
import type { ProfileData } from '../lib/profileTypes'

/** O cartão de qualquer usuário (o do próprio vem da sessão, em /users/me). */
export const getProfile = (userId: string): Promise<ProfileData> =>
  request<ProfileData>(`/users/${encodeURIComponent(userId)}/profile`)

/** Salva o perfil (o backend recebe cada link como { url }). Devolve a conta atualizada. */
export function updateProfile(fields: ProfileFields): Promise<User> {
  return request<User>('/users/me/profile', {
    method: 'PUT',
    body: JSON.stringify({ ...fields, links: fields.links.map((url) => ({ url })) })
  })
}
