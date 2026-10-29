import { request } from '../../../shared/api/client'

export interface Birthday {
  day: number | null
  month: number | null
  year: number | null
  /** Os servidores podem anunciar (e mostrar o modal). */
  announce: boolean
}

export function getBirthday(): Promise<Birthday> {
  return request<Birthday>('/users/me/birthday')
}

export function setBirthday(birthday: Birthday): Promise<Birthday> {
  return request<Birthday>('/users/me/birthday', {
    method: 'PUT',
    body: JSON.stringify(birthday)
  })
}
