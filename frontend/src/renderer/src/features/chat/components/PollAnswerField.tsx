import { useState } from 'react'
import { POLL_ANSWER_MAX, POLL_EMOJIS, type PollDraftAnswer } from '../lib/polls'
import { PollAnswerMedia } from './PollAnswerMedia'
import CloseButton from '../../../shared/ui/CloseButton'
import { SmileyIcon } from '../../../shared/ui/icons'

// Uma resposta no formulário de criar enquete (CreatePollModal).

/** Seletor do emoji ou da mini imagem de uma resposta. */
function MediaPicker({
  answer,
  onChange,
  onClose
}: {
  answer: PollDraftAnswer
  onChange: (media: Pick<PollDraftAnswer, 'emoji' | 'image_url'>) => void
  onClose: () => void
}): React.JSX.Element {
  const [url, setUrl] = useState(answer.image_url)

  return (
    <div
      className="absolute left-0 top-full z-10 mt-1 w-72 rounded-lg border border-subtle bg-floating p-3 shadow-2xl"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-8 gap-1">
        {POLL_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              onChange({ emoji, image_url: '' })
              onClose()
            }}
            className={`cursor-pointer rounded-md p-1 text-ds-lg leading-none transition-colors hover:bg-fg/10 ${
              answer.emoji === emoji ? 'bg-brand/30' : ''
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          onChange({ emoji: '', image_url: url.trim() })
          onClose()
        }}
      >
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="ou link de uma imagem (https://…)"
          maxLength={512}
          className="glass-input min-w-0 flex-1 !py-1.5 text-ds-xs"
        />
        <button
          type="submit"
          disabled={!url.trim()}
          className="cursor-pointer rounded-md bg-fg/10 px-2 text-ds-xs font-semibold text-strong hover:bg-fg/15 disabled:opacity-40"
        >
          Usar
        </button>
      </form>
      {(answer.emoji || answer.image_url) && (
        <button
          type="button"
          onClick={() => {
            onChange({ emoji: '', image_url: '' })
            onClose()
          }}
          className="mt-2 cursor-pointer text-ds-xs font-semibold text-muted hover:text-danger"
        >
          Remover emoji/imagem
        </button>
      )}
    </div>
  )
}

/** Botão do emoji/imagem, o texto e o remover (só acima do mínimo de respostas). */
export function PollAnswerField({
  index,
  answer,
  pickerOpen,
  removable,
  onTogglePicker,
  onClosePicker,
  onChange,
  onRemove
}: {
  index: number
  answer: PollDraftAnswer
  pickerOpen: boolean
  removable: boolean
  onTogglePicker: () => void
  onClosePicker: () => void
  onChange: (patch: Partial<PollDraftAnswer>) => void
  onRemove: () => void
}): React.JSX.Element {
  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        title="Escolher emoji ou imagem"
        aria-label={`Emoji ou imagem da resposta ${index + 1}`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={onTogglePicker}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-subtle bg-fg/5 text-ds-lg text-muted transition-colors hover:bg-fg/10"
      >
        {answer.emoji || answer.image_url ? (
          <PollAnswerMedia answer={answer} />
        ) : (
          <SmileyIcon />
        )}
      </button>
      {pickerOpen && <MediaPicker answer={answer} onChange={onChange} onClose={onClosePicker} />}
      <input
        value={answer.text}
        onChange={(e) => onChange({ text: e.target.value })}
        maxLength={POLL_ANSWER_MAX}
        placeholder={`Resposta ${index + 1}`}
        className="glass-input min-w-0 flex-1"
      />
      {removable && (
        <CloseButton
          label={`Remover resposta ${index + 1}`}
          size="sm"
          variant="danger"
          onClick={onRemove}
        />
      )}
    </div>
  )
}
