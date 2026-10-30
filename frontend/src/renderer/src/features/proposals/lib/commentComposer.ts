// Textos do campo de comentário (CommentComposer) que mudam com o estado.

/** Rótulo do botão de enviar. */
export function commentButtonLabel(uploading: boolean, sending: boolean): string {
  if (uploading) return 'Enviando arquivos...'
  return sending ? 'Enviando...' : 'Comentar'
}

/** Dica do campo: fala com quem está sendo respondido. */
export function commentPlaceholder(replyingTo: { author_name: string } | null): string {
  return replyingTo ? `Responder a @${replyingTo.author_name}...` : 'Comente, ou use @ para marcar alguém'
}
