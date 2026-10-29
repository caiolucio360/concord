import type { Attachment } from '../api/messages'

/**
 * Tamanho da caixa de uma imagem/vídeo na conversa: cabe em max mantendo a
 * proporção e nunca aumenta. Reservado antes de carregar para a lista não pular.
 * Mesma regra do desktop; o máximo cai para a largura da tela no celular.
 */
export function fitMedia(
  width?: number | null,
  height?: number | null,
  max = { width: 400, height: 300 }
): { width: number; height: number } {
  if (!width || !height || width <= 0 || height <= 0) return { width: max.width, height: Math.round((max.width * 9) / 16) }
  const scale = Math.min(1, max.width / width, max.height / height)
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Caixa do GIF do Giphy: lado maior até 300, proporção mantida (como o desktop). */
export function fitGif(width?: number, height?: number): { width: number; height: number } | null {
  if (!width || !height) return null
  const ratio = width / height
  if (ratio > 1) {
    const w = Math.min(width, 300)
    return { width: w, height: Math.round(w / ratio) }
  }
  const h = Math.min(height, 300)
  return { width: Math.round(h * ratio), height: h }
}

const decimal = (value: number): string => String(Math.round(value * 10) / 10).replace('.', ',')

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${decimal(bytes / 1024)} KB`
  return `${decimal(bytes / (1024 * 1024))} MB`
}

export function mediaFileUrl(apiBaseUrl: string, attachmentId: string, token: string): string {
  return `${apiBaseUrl}/media/${attachmentId}?token=${encodeURIComponent(token)}`
}

export function stickerFileUrl(apiBaseUrl: string, stickerId: string, token?: string | null): string {
  const query = token ? `?token=${encodeURIComponent(token)}` : ''
  return `${apiBaseUrl}/stickers/${encodeURIComponent(stickerId)}/file${query}`
}

/** Imagens/vídeos ficam lado a lado; áudios, um por linha. */
export function splitAttachments(attachments: Attachment[]): { visual: Attachment[]; audios: Attachment[] } {
  return { visual: attachments.filter((a) => a.kind !== 'audio'), audios: attachments.filter((a) => a.kind === 'audio') }
}
