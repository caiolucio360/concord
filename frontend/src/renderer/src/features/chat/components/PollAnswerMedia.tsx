import type { PollAnswer } from '../api/messages'

/** Emoji ou mini imagem da resposta. */
export function PollAnswerMedia({
  answer,
  className = 'h-6 w-6 text-ds-lg'
}: {
  answer: Pick<PollAnswer, 'emoji' | 'image_url'>
  className?: string
}): React.JSX.Element | null {
  if (answer.emoji) {
    return (
      <span className={`flex shrink-0 items-center justify-center leading-none ${className}`}>
        {answer.emoji}
      </span>
    )
  }
  if (answer.image_url) {
    return (
      <img
        src={answer.image_url}
        alt=""
        className={`shrink-0 rounded object-cover ${className}`}
        draggable={false}
      />
    )
  }
  return null
}
