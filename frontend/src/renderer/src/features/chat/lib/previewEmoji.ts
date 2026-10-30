// Prévia em texto puro, para onde não dá para desenhar ícone: a notificação do
// sistema operacional e a última mensagem da conversa (igual à que o backend
// manda). Dentro do app a prévia usa PreviewText, com o ícone do conjunto.
import type { Preview, PreviewKind } from './preview'

const EMOJI: Record<PreviewKind, string> = {
  image: '🖼️',
  video: '🎬',
  audio: '🎤',
  attachment: '📎',
  sticker: '💟',
  gif: '👾',
  poll: '📊'
}

/** "📊 Pergunta", "🖼️ Imagem"…; só texto fica como está. */
export function previewToText(preview: Preview): string {
  return preview.icon ? `${EMOJI[preview.icon]} ${preview.text}` : preview.text
}
