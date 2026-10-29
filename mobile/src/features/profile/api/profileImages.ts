import { request } from '../../../shared/api/client'
import { uploadFile, type UploadFile } from '../../../shared/api/upload'
import type { User } from '../../auth/store/authStore'

export type ProfileImageKind = 'avatar' | 'banner'

const UPLOAD_ERRORS: Record<number, string> = {
  413: 'A imagem pode ter até 10 MB.',
  415: 'Use uma imagem PNG, JPG, GIF ou WebP.',
  507: 'O servidor está sem espaço agora. Tente mais tarde.'
}

/** Sobe o avatar ou o banner; devolve a conta atualizada. */
export function uploadProfileImage(kind: ProfileImageKind, file: UploadFile, onProgress?: (fraction: number) => void): Promise<User> {
  return uploadFile<User>(`/users/me/${kind}`, file, {}, { onProgress }, UPLOAD_ERRORS)
}

/** Tira o avatar/banner (volta à inicial do nome / à cor do banner). */
export function deleteProfileImage(kind: ProfileImageKind): Promise<User> {
  return request<User>(`/users/me/${kind}`, { method: 'DELETE' })
}
