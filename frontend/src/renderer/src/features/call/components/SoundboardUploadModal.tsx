import { useEffect, useRef, useState } from 'react'
import {
  MAX_SOUNDBOARD_BYTES,
  MAX_SOUNDBOARD_DURATION_MS,
  MAX_SOUNDBOARD_NAME_LEN,
  MIN_SOUNDBOARD_DURATION_MS
} from '../api/soundboard'
import { useSoundboardStore } from '../store/soundboardStore'
import { showToast } from '../../../shared/store/toastStore'
import { readMediaMeta } from '../../chat/lib/readMediaMeta'
import Input from '../../../shared/ui/Input'
import Modal from '../../../shared/ui/Modal'
import {
  DEFAULT_SOUND_EMOJI,
  SoundEmojiField,
  SoundFileField,
  SoundUploadActions
} from './SoundboardUploadFields'

interface SoundboardUploadModalProps {
  open: boolean
  serverId: string
  onClose: () => void
}

function SoundboardUploadModal({
  open,
  serverId,
  onClose
}: SoundboardUploadModalProps): React.JSX.Element | null {
  const uploadSound = useSoundboardStore((s) => s.uploadSound)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [durationMs, setDurationMs] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(DEFAULT_SOUND_EMOJI)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      // Fechou o modal: zera o formulário para a próxima abertura.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFile(null)
      setDurationMs(null)
      setName('')
      setEmoji(DEFAULT_SOUND_EMOJI)
      setPreviewPlaying(false)
      setSubmitting(false)
      setError(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
    }
  }, [open, previewUrl])

  if (!open) return null

  const handleSelectFile = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const selected = e.target.files?.[0]
    e.target.value = ''
    if (!selected) return

    setError(null)
    if (selected.size > MAX_SOUNDBOARD_BYTES) {
      setError('O arquivo excede o limite de 5 MB.')
      return
    }

    const meta = await readMediaMeta(selected, 'audio')
    const dur = meta.duration_ms ?? 0
    if (!dur || dur < MIN_SOUNDBOARD_DURATION_MS || dur > MAX_SOUNDBOARD_DURATION_MS) {
      setError('O áudio precisa ser válido e ter entre 0,1s e 15s de duração.')
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const nextUrl = URL.createObjectURL(selected)
    setFile(selected)
    setDurationMs(dur)
    setPreviewUrl(nextUrl)
    setPreviewPlaying(false)

    if (!name.trim()) {
      const baseName = selected.name.replace(/\.[^.]+$/, '').slice(0, MAX_SOUNDBOARD_NAME_LEN)
      setName(baseName)
    }
  }

  const togglePreview = (): void => {
    const el = previewAudioRef.current
    if (!el || !previewUrl) return
    if (previewPlaying) {
      el.pause()
      el.currentTime = 0
      setPreviewPlaying(false)
    } else {
      el.currentTime = 0
      void el
        .play()
        .then(() => setPreviewPlaying(true))
        .catch(() => setPreviewPlaying(false))
    }
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!file || !durationMs || submitting) return
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Digite um nome para o som.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await uploadSound(serverId, file, {
        name: trimmedName,
        emoji: emoji.trim() || undefined,
        duration_ms: durationMs,
        filename: file.name
      })
      showToast.success('Som adicionado à mesa de áudio!')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o áudio.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open title="Adicionar Som à Mesa de Áudio" onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <SoundFileField
          fileInputRef={fileInputRef}
          previewAudioRef={previewAudioRef}
          file={file}
          durationMs={durationMs}
          previewUrl={previewUrl}
          previewPlaying={previewPlaying}
          onPick={(e) => void handleSelectFile(e)}
          onTogglePreview={togglePreview}
          onPreviewEnded={() => setPreviewPlaying(false)}
        />

        <div>
          <label className="mb-1.5 block text-ds-sm font-medium text-muted">
            Nome do botão
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, MAX_SOUNDBOARD_NAME_LEN))}
            placeholder="Ex.: Corneta, Risada, Tambores…"
            maxLength={MAX_SOUNDBOARD_NAME_LEN}
            required
          />
        </div>

        <SoundEmojiField emoji={emoji} onChange={setEmoji} />

        {error && <p className="text-xs font-medium text-danger">{error}</p>}

        <SoundUploadActions
          file={file}
          name={name}
          submitting={submitting}
          onCancel={onClose}
        />
      </form>
    </Modal>
  )
}

export default SoundboardUploadModal
