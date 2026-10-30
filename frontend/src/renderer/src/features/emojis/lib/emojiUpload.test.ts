import { describe, expect, it, vi } from 'vitest'
import {
  ERROR_FORMAT,
  ERROR_GENERIC,
  ERROR_NAME,
  ERROR_TOO_LARGE,
  emojiFileError,
  emojiNameError,
  emojiNameFromFile,
  pickEmojiFile,
  sendEmoji,
  uploadErrorMessage
} from './emojiUpload'

describe('emojiUpload', () => {
  it('aceita os formatos do Discord até 256 KB', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif']) {
      expect(emojiFileError({ size: 1000, type })).toBeNull()
    }
    expect(emojiFileError({ size: 256 * 1024 + 1, type: 'image/png' })).toBe(ERROR_TOO_LARGE)
    expect(emojiFileError({ size: 10, type: 'image/svg+xml' })).toBe(ERROR_FORMAT)
  })

  it('valida o nome', () => {
    expect(emojiNameError('festa_2')).toBeNull()
    expect(emojiNameError('a')).toBe(ERROR_NAME)
  })

  it('sugere o nome a partir do arquivo', () => {
    expect(emojiNameFromFile('Gato Feliz!.png')).toBe('gato_feliz')
    expect(emojiNameFromFile('ação.gif')).toBe('acao')
    expect(emojiNameFromFile('x'.repeat(40) + '.png')).toHaveLength(32)
  })
})

const png = (name = 'Gato.png', size = 100): File => new File([new Uint8Array(size)], name, { type: 'image/png' })

describe('pickEmojiFile', () => {
  it('sem arquivo não muda nada', () => {
    expect(pickEmojiFile(undefined, 'x')).toEqual({ error: null, file: null, name: 'x' })
  })
  it('arquivo ruim explica e não troca o nome', () => {
    expect(pickEmojiFile(png('a.png', 300 * 1024), 'x')).toEqual({ error: ERROR_TOO_LARGE, file: null, name: 'x' })
  })
  it('arquivo bom sugere nome só se ainda não tem', () => {
    const file = png()
    expect(pickEmojiFile(file, '')).toEqual({ error: null, file, name: 'gato' })
    expect(pickEmojiFile(file, 'meu').name).toBe('meu')
  })
})

describe('sendEmoji', () => {
  it('nome inválido não envia', async () => {
    const upload = vi.fn()
    expect(await sendEmoji(upload, 's1', 'a', png())).toBe(ERROR_NAME)
    expect(await sendEmoji(upload, 's1', 'festa', null)).toBe(ERROR_FORMAT)
    expect(upload).not.toHaveBeenCalled()
  })
  it('envia e devolve null; erro do servidor vira a mensagem', async () => {
    const file = png()
    const upload = vi.fn().mockResolvedValueOnce({})
    expect(await sendEmoji(upload, 's1', 'festa', file)).toBeNull()
    expect(upload).toHaveBeenCalledWith('s1', 'festa', file)
    upload.mockRejectedValueOnce(new Error('Este servidor já tem 50 emojis.'))
    expect(await sendEmoji(upload, 's1', 'festa', file)).toBe('Este servidor já tem 50 emojis.')
    upload.mockRejectedValueOnce('falhou')
    expect(await sendEmoji(upload, 's1', 'festa', file)).toBe(ERROR_GENERIC)
  })
})

describe('uploadErrorMessage', () => {
  const apiErr = (status: number, message: string): Error => Object.assign(new Error(message), { status })
  it('texto técnico do servidor nunca chega a quem envia', () => {
    expect(uploadErrorMessage(apiErr(400, 'invalid multipart body'))).toBe(ERROR_GENERIC)
    expect(uploadErrorMessage(apiErr(413, 'Upload failed: 413'))).toBe(ERROR_TOO_LARGE)
    expect(uploadErrorMessage(apiErr(415, 'x'))).toBe(ERROR_FORMAT)
    expect(uploadErrorMessage(null)).toBe(ERROR_GENERIC)
  })
  it('erro aprovado do servidor passa como veio', () => {
    expect(uploadErrorMessage(apiErr(409, 'Este servidor já tem 50 emojis.'))).toBe('Este servidor já tem 50 emojis.')
  })
})
