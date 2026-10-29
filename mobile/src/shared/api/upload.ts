import { API_BASE_URL } from '../lib/config'
import { ApiError, refreshSession } from './client'
import { session } from './session'

export interface UploadOptions {
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

/** Um arquivo do aparelho a enviar (o React Native lê direto do disco pela `uri`). */
export interface UploadFile {
  uri: string
  name: string
  mimeType: string
}

/** Mensagem por status quando o servidor não manda a dele. */
export type UploadErrors = Record<number, string>

/**
 * Envia um arquivo (multipart) com `XMLHttpRequest`: o fetch não dá progresso de envio e arquivos grandes
 * passam do limite de tempo do `request`. `fields` vão antes do arquivo (o backend aceita qualquer ordem).
 * Se o token venceu (401), renova a sessão e tenta uma vez de novo.
 */
export async function uploadFile<T>(path: string, file: UploadFile, fields: Record<string, string> = {}, opts: UploadOptions = {}, errors: UploadErrors = {}): Promise<T> {
  const token = session().tokens().accessToken
  try {
    return await send<T>(path, file, fields, opts, errors, token)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && token && (await refreshSession(token)) === 'ok') {
      return send<T>(path, file, fields, opts, errors, session().tokens().accessToken)
    }
    throw err
  }
}

function send<T>(path: string, file: UploadFile, fields: Record<string, string>, { onProgress, signal }: UploadOptions, errors: UploadErrors, token: string | null): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new ApiError(0, 'aborted'))

    const form = new FormData()
    for (const [name, value] of Object.entries(fields)) form.append(name, value)
    // No React Native o arquivo vai como { uri, name, type }.
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as unknown as Blob)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE_URL}${path}`)
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
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as T)
      else reject(new ApiError(xhr.status, errors[xhr.status] ?? (body as { error?: string }).error ?? 'Upload failed'))
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
