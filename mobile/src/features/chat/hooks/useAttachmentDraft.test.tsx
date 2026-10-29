import { act, renderHook, waitFor } from '@testing-library/react-native'
import { ApiError } from '../../../shared/api/client'
import type { Attachment } from '../api/messages'
import type { PickedFile } from '../lib/attachments'
import { useAttachmentDraft } from './useAttachmentDraft'

const pic = (name = 'a.png', over: Partial<PickedFile> = {}): PickedFile => ({ uri: `file:///${name}`, name, mimeType: 'image/png', size: 100, ...over })
const att = (id: string): Attachment => ({ id, kind: 'image', content_type: 'image/png', filename: 'a.png', size_bytes: 100 })

describe('useAttachmentDraft', () => {
  it('cada arquivo sobe ao entrar e vira "done" com o anexo e progresso', async () => {
    const upload = jest.fn().mockImplementation(async (_room, _file, opts) => {
      opts.onProgress(0.5)
      return att('a1')
    })
    const { result } = await renderHook(() => useAttachmentDraft('channel:c1', upload))
    await act(async () => result.current.addFiles([pic()]))
    await waitFor(() => expect(result.current.drafts[0].status).toBe('done'))
    expect(result.current.drafts[0]).toMatchObject({ progress: 1, attachment: { id: 'a1' }, kind: 'image' })
    expect(upload).toHaveBeenCalledWith('channel:c1', expect.objectContaining({ name: 'a.png' }), expect.any(Object))
  })

  it('arquivo recusado não sobe e deixa o motivo; passar de 10 também', async () => {
    const upload = jest.fn().mockResolvedValue(att('x'))
    const { result } = await renderHook(() => useAttachmentDraft('channel:c1', upload))
    await act(async () => result.current.addFiles([pic('x.exe', { mimeType: 'application/octet-stream' })]))
    expect(upload).not.toHaveBeenCalled()
    expect(result.current.errors[0]).toMatch(/não é um tipo aceito/)
    await act(async () => result.current.addFiles(Array.from({ length: 11 }, (_, i) => pic(`f${i}.png`))))
    expect(result.current.drafts).toHaveLength(10)
    expect(result.current.errors).toContain('Máximo de 10 arquivos por mensagem.')
  })

  it('falha do upload marca o erro conforme o status', async () => {
    const upload = jest.fn().mockRejectedValue(new ApiError(413, 'x'))
    const { result } = await renderHook(() => useAttachmentDraft('channel:c1', upload))
    await act(async () => result.current.addFiles([pic()]))
    await waitFor(() => expect(result.current.drafts[0].status).toBe('error'))
    expect(result.current.drafts[0].error).toBe('Arquivo maior que 25 MB.')
    expect(result.current.errors).toEqual(['"a.png": Arquivo maior que 25 MB.'])
  })

  it('remover cancela o envio em andamento e libera a vaga; limpar zera tudo', async () => {
    let signal: AbortSignal | undefined
    const upload = jest.fn().mockImplementation((_r, _f, opts) => {
      signal = opts.signal
      return new Promise(() => {})
    })
    const { result } = await renderHook(() => useAttachmentDraft('channel:c1', upload))
    await act(async () => result.current.addFiles([pic()]))
    await act(async () => result.current.remove(result.current.drafts[0].localId))
    expect(signal?.aborted).toBe(true)
    expect(result.current.drafts).toEqual([])
    await act(async () => result.current.addFiles([pic('b.png')]))
    await act(async () => result.current.clear())
    expect(signal?.aborted).toBe(true)
    expect(result.current.drafts).toEqual([])
  })

  it('trocar de sala cancela e zera o rascunho', async () => {
    let signal: AbortSignal | undefined
    const upload = jest.fn().mockImplementation((_r, _f, opts) => {
      signal = opts.signal
      return new Promise(() => {})
    })
    const { result, rerender } = await renderHook(({ room }: { room: string }) => useAttachmentDraft(room, upload), { initialProps: { room: 'channel:c1' } })
    await act(async () => result.current.addFiles([pic()]))
    await rerender({ room: 'channel:c2' })
    expect(signal?.aborted).toBe(true)
    expect(result.current.drafts).toEqual([])
  })

  it('upload cancelado (abort) não vira erro', async () => {
    const upload = jest.fn().mockImplementation((_r, _f, opts) => new Promise((_, reject) => opts.signal.addEventListener('abort', () => reject(new ApiError(0, 'aborted')))))
    const { result } = await renderHook(() => useAttachmentDraft('channel:c1', upload))
    await act(async () => result.current.addFiles([pic()]))
    await act(async () => result.current.remove(result.current.drafts[0].localId))
    expect(result.current.errors).toEqual([])
  })
})
