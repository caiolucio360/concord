import type { ComponentType } from 'react'
import type { Preview, PreviewKind } from '../lib/preview'
import {
  CameraIcon,
  GifIcon,
  ImageIcon,
  MicIcon,
  PaperclipIcon,
  PollIcon,
  StickerIcon,
  type IconProps
} from '../../../shared/ui/icons'

const ICONS: Record<PreviewKind, ComponentType<IconProps>> = {
  image: ImageIcon,
  video: CameraIcon,
  audio: MicIcon,
  attachment: PaperclipIcon,
  sticker: StickerIcon,
  gif: GifIcon,
  poll: PollIcon
}

/**
 * Prévia de mensagem numa linha: o ícone do tipo (imagem, enquete, GIF…) e o
 * texto, cortado com reticências. Só texto vira só o texto.
 */
export default function PreviewText({
  preview,
  className = ''
}: {
  preview: Preview
  className?: string
}): React.JSX.Element {
  if (!preview.icon) return <span className={`truncate ${className}`}>{preview.text}</span>
  const Icon = ICONS[preview.icon]
  return (
    <span className={`inline-flex min-w-0 max-w-full items-center gap-1 align-bottom ${className}`}>
      <Icon size={16} className="shrink-0" />
      <span className="truncate">{preview.text}</span>
    </span>
  )
}
