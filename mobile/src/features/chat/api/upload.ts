import { uploadFile, type UploadOptions } from '../../../shared/api/upload'
import type { PickedFile } from '../lib/attachments'
import type { Attachment } from './messages'

export type { UploadOptions }

/** `channel:<id>` ou `conversation:<id>` -> caminho da API (igual ao roomPath do desktop). */
export function roomPath(room: string): string {
  return room.startsWith('channel:') ? `/channels/${room.slice('channel:'.length)}` : `/conversations/${room.slice('conversation:'.length)}`
}

/** Sobe um arquivo para a sala (fica "pendente" até a mensagem ser criada com o id dele). */
export function uploadAttachment(room: string, file: PickedFile, opts: UploadOptions = {}): Promise<Attachment> {
  const fields: Record<string, string> = {}
  if (file.width !== undefined) fields.width = String(file.width)
  if (file.height !== undefined) fields.height = String(file.height)
  if (file.duration_ms !== undefined) fields.duration_ms = String(file.duration_ms)
  return uploadFile<Attachment>(`${roomPath(room)}/attachments`, file, fields, opts)
}
