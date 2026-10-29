import type { Attachment } from '../api/messages'
import { fitGif, fitMedia, formatBytes, mediaFileUrl, splitAttachments, stickerFileUrl } from './attachments'

const att = (kind: Attachment['kind']): Attachment => ({ id: kind, kind, content_type: 'x/y', filename: 'f', size_bytes: 1 })

describe('anexos', () => {
  it('fitMedia mantém a proporção e nunca aumenta', () => {
    expect(fitMedia(800, 600)).toEqual({ width: 400, height: 300 })
    expect(fitMedia(100, 50)).toEqual({ width: 100, height: 50 })
    expect(fitMedia(300, 1200)).toEqual({ width: 75, height: 300 })
  })
  it('fitMedia sem medidas reserva uma caixa 16:9 do tamanho máximo', () => {
    expect(fitMedia(null, null)).toEqual({ width: 400, height: 225 })
    expect(fitMedia(0, 10, { width: 200, height: 100 })).toEqual({ width: 200, height: 113 })
  })
  it('fitGif: lado maior até 300; sem medidas devolve null', () => {
    expect(fitGif(600, 300)).toEqual({ width: 300, height: 150 })
    expect(fitGif(200, 400)).toEqual({ width: 150, height: 300 })
    expect(fitGif(undefined, 10)).toBeNull()
  })
  it('formatBytes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1,5 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB')
  })
  it('urls de arquivo e figurinha levam o token codificado', () => {
    expect(mediaFileUrl('https://a/api', 'm1', 'a b')).toBe('https://a/api/media/m1?token=a%20b')
    expect(stickerFileUrl('https://a/api', 's/1', 't')).toBe('https://a/api/stickers/s%2F1/file?token=t')
    expect(stickerFileUrl('https://a/api', 's1')).toBe('https://a/api/stickers/s1/file')
  })
  it('splitAttachments separa áudio do resto', () => {
    const { visual, audios } = splitAttachments([att('image'), att('audio'), att('video')])
    expect(visual.map((a) => a.kind)).toEqual(['image', 'video'])
    expect(audios.map((a) => a.kind)).toEqual(['audio'])
  })
})
