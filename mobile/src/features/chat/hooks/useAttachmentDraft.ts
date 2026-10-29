import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../../../shared/api/client'
import type { Attachment } from '../api/messages'
import { uploadAttachment, type UploadOptions } from '../api/upload'
import { acceptFiles, uploadErrorMessage, type DraftAttachment, type PickedFile } from '../lib/attachments'

export type DraftUploader = (room: string, file: PickedFile, opts?: UploadOptions) => Promise<Attachment>

let nextLocalId = 0

/**
 * Anexos do campo de envio: cada arquivo começa a subir assim que entra. Remover, limpar, trocar de sala
 * ou sair cancelam o que ainda está subindo (nada vai parar na sala nova). Igual ao hook do desktop.
 */
export function useAttachmentDraft(room: string, upload: DraftUploader = uploadAttachment) {
  const [drafts, setDrafts] = useState<DraftAttachment[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const uploads = useRef(new Map<string, AbortController>())
  // Quais há no rascunho agora (addFiles pode ser chamado de novo antes do próximo render).
  const count = useRef(0)

  const releaseAll = useCallback(() => {
    uploads.current.forEach((c) => c.abort())
    uploads.current.clear()
    count.current = 0
  }, [])

  // Trocar de sala (ou sair da tela) cancela os envios e zera o rascunho.
  useEffect(() => {
    setDrafts([])
    setErrors([])
    return releaseAll
  }, [room, releaseAll])

  const update = useCallback((localId: string, patch: Partial<DraftAttachment>) => {
    setDrafts((ds) => ds.map((d) => (d.localId === localId ? { ...d, ...patch } : d)))
  }, [])

  const start = useCallback(
    async (draft: DraftAttachment) => {
      const controller = new AbortController()
      uploads.current.set(draft.localId, controller)
      try {
        const attachment = await upload(room, draft.file, { signal: controller.signal, onProgress: (progress) => update(draft.localId, { progress }) })
        if (!controller.signal.aborted) update(draft.localId, { status: 'done', progress: 1, attachment })
      } catch (err) {
        if (controller.signal.aborted) return
        const error = uploadErrorMessage(err instanceof ApiError ? err.status : 0)
        update(draft.localId, { status: 'error', error })
        setErrors((e) => [...e, `"${draft.file.name}": ${error}`])
      } finally {
        if (uploads.current.get(draft.localId) === controller) uploads.current.delete(draft.localId)
      }
    },
    [room, update, upload]
  )

  const addFiles = useCallback(
    (files: PickedFile[]) => {
      const { accepted, errors: rejected } = acceptFiles(count.current, files)
      setErrors(rejected)
      if (accepted.length === 0) return
      count.current += accepted.length
      const added: DraftAttachment[] = accepted.map(({ file, kind }) => ({ localId: `d${nextLocalId++}`, file, kind, status: 'uploading', progress: 0 }))
      setDrafts((ds) => [...ds, ...added])
      added.forEach((d) => void start(d))
    },
    [start]
  )

  const remove = useCallback((localId: string) => {
    uploads.current.get(localId)?.abort()
    uploads.current.delete(localId)
    count.current = Math.max(0, count.current - 1)
    setDrafts((ds) => ds.filter((d) => d.localId !== localId))
  }, [])

  const clear = useCallback(() => {
    releaseAll()
    setDrafts([])
    setErrors([])
  }, [releaseAll])

  return { drafts, errors, addFiles, remove, clear }
}
