import { ApiError, refreshSession } from '../../../shared/api/client'
import { API_BASE_URL } from '../../../shared/lib/config'
import { useAuthStore } from '../../auth/store/authStore'
import type { PickedFile } from '../lib/attachments'
import type { Attachment } from './messages'

export interface UploadOptions {
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

/** `channel:<id>` ou `conversation:<id>` -> caminho da API (igual ao roomPath do desktop). */
export function roomPath(room: string): string {
  return room.startsWith('channel:') ? `/channels/${room.slice('channel:'.length)}` : `/conversations/${room.slice('conversation:'.length)}`
}

/**
 * Sobe um arquivo para a sala (fica "pendente" até a mensagem ser criada com o id dele). Usa XMLHttpRequest
 * porque o fetch não dá progresso de envio e 25 MB numa rede lenta passa do limite de tempo do `request`.
 * Se o token venceu (401), renova a sessão e tenta uma vez de novo.
 */
export async function uploadAttachment(room: string, file: PickedFile, opts: UploadOptions = {}): Promise<Attachment> {
  const token = useAuthStore.getState().accessToken
  try {
    return await sendUpload(room, file, opts, token)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && token && (await refreshSession(token)) === 'ok') {
      return sendUpload(room, file, opts, useAuthStore.getState().accessToken)
    }
    throw err
  }
}

function sendUpload(room: string, file: PickedFile, { onProgress, signal }: UploadOptions, token: string | null): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new ApiError(0, 'aborted'))

    const form = new FormData()
    // Campos antes do arquivo; o backend aceita em qualquer ordem.
    if (file.width !== undefined) form.append('width', String(file.width))
    if (file.height !== undefined) form.append('height', String(file.height))
    if (file.duration_ms !== undefined) form.append('duration_ms', String(file.duration_ms))
    // No React Native o arquivo vai como { uri, name, type }; o FormData nativo lê direto do disco.
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as unknown as Blob)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE_URL}${roomPath(room)}/attachments`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    const onAbort = (): void => xhr.abort()
    signal?.addEventListener('abort', onAbort)
    const done = (): void => signal?.removeEventListener('abort', onAbort)

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && e.total > 0) onProgress?.(e.loaded / e.total)
    })
    xhr.onload = () => {
      done()
      let body: unknown = {}
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        // corpo vazio ou que não é JSON
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as Attachment)
      else reject(new ApiError(xhr.status, (body as { error?: string }).error ?? 'Upload failed'))
    }
    xhr.onerror = () => {
      done()
      reject(new ApiError(0, 'Network error'))
    }
    xhr.onabort = () => {
      done()
      reject(new ApiError(0, 'aborted'))
    }
    xhr.send(form)
  })
}
