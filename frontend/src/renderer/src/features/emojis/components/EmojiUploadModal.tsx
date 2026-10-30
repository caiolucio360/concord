import { useEffect, useState } from 'react'
import Modal from '../../../shared/ui/Modal'
import Button from '../../../shared/ui/Button'
import Input from '../../../shared/ui/Input'
import { EMOJI_ACCEPT } from '../api/emojis'
import { useEmojiStore } from '../store/emojiStore'
import { pickEmojiFile, sendEmoji } from '../lib/emojiUpload'

/** Prévia do arquivo escolhido (a URL é liberada ao trocar ou fechar). */
function usePreview(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!file) return setUrl(null)
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return url
}

/** "Novo emoji": imagem + nome, enviado ao servidor aberto. */
export default function EmojiUploadModal({
  serverId,
  onClose
}: {
  serverId: string
  onClose: () => void
}): React.JSX.Element {
  const upload = useEmojiStore((s) => s.upload)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const preview = usePreview(file)

  const pick = (selected: File | undefined): void => {
    const picked = pickEmojiFile(selected, name)
    setError(picked.error)
    if (picked.file) {
      setFile(picked.file)
      setName(picked.name)
    }
  }

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setSubmitting(true)
    const failure = await sendEmoji(upload, serverId, name, file)
    if (!failure) return onClose()
    setError(failure)
    setSubmitting(false)
  }

  return (
    <Modal open title="Novo emoji" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && (
          <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-300">
            {error}
          </div>
        )}
        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-center transition-colors hover:border-violet-500/50 hover:bg-white/10 focus-within:border-violet-500">
          <input
            type="file"
            accept={EMOJI_ACCEPT}
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {preview && <img src={preview} alt="" width={64} height={64} className="h-16 w-16 object-contain" />}
          <span className="text-xs text-gray-400">
            PNG, JPEG, WEBP, AVIF ou GIF, até 256 KB. O ideal é 128×128.
          </span>
        </label>
        <Input
          label="Nome"
          name="emoji-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="nome_do_emoji"
          maxLength={32}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={submitting || !file || !name}>
            Enviar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
