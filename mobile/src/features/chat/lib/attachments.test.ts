import type { Attachment } from '../api/messages'
import { acceptFiles, canSubmit, classifyFile, draftStatus, uploadErrorMessage, type PickedFile } from './attachments'
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

const file = (over: Partial<PickedFile> = {}): PickedFile => ({ uri: 'file:///a.png', name: 'a.png', mimeType: 'image/png', size: 1000, ...over })

describe('anexos a enviar', () => {
  it('classifica por MIME (com parâmetros) e, sem MIME, pela extensão', () => {
    expect(classifyFile(file({ mimeType: 'IMAGE/PNG; x=1' }))).toEqual({ ok: true, kind: 'image' })
    expect(classifyFile(file({ name: 'voz.m4a', mimeType: '' }))).toEqual({ ok: true, kind: 'audio' })
    expect(classifyFile(file({ name: 'v.mp4', mimeType: 'video/mp4' }))).toEqual({ ok: true, kind: 'video' })
  })
  it('recusa tipo desconhecido, vazio e maior que 25 MB', () => {
    expect(classifyFile(file({ name: 'x.exe', mimeType: 'application/x-msdownload' }))).toMatchObject({ ok: false })
    expect(classifyFile(file({ name: 'semextensao', mimeType: '' }))).toMatchObject({ ok: false })
    expect(classifyFile(file({ size: 0 }))).toMatchObject({ ok: false, error: '"a.png" está vazio.' })
    expect(classifyFile(file({ size: 26 * 1024 * 1024 }))).toMatchObject({ ok: false, error: '"a.png" tem mais de 25 MB.' })
  })
  it('acceptFiles respeita o máximo de 10 por mensagem', () => {
    const many = Array.from({ length: 4 }, (_, i) => file({ name: `f${i}.png` }))
    const { accepted, errors } = acceptFiles(8, many)
    expect(accepted).toHaveLength(2)
    expect(errors).toEqual(['Máximo de 10 arquivos por mensagem.'])
    expect(acceptFiles(0, [file({ size: 0 })]).accepted).toHaveLength(0)
  })
  it('mensagens de erro de upload', () => {
    expect([413, 415, 507, 403, 500].map(uploadErrorMessage)).toEqual([
      'Arquivo maior que 25 MB.',
      'Tipo de arquivo não aceito.',
      'Servidor sem espaço para novos arquivos.',
      'Você não pode enviar arquivos aqui.',
      'Falha ao enviar o arquivo.'
    ])
  })
  it('draftStatus e canSubmit: só envia com nada subindo/falho e texto ou anexo pronto', () => {
    const done = { status: 'done' as const, attachment: { id: 'a1' } as never }
    const up = { status: 'uploading' as const }
    const bad = { status: 'error' as const }
    expect(draftStatus([done, up, bad])).toEqual({ readyIds: ['a1'], uploading: true, failed: true })
    expect(canSubmit('', [])).toBe(false)
    expect(canSubmit('oi', [])).toBe(true)
    expect(canSubmit('', [done])).toBe(true)
    expect(canSubmit('oi', [done, up])).toBe(false)
    expect(canSubmit('oi', [bad])).toBe(false)
  })
})
