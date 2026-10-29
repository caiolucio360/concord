import { act, renderHook, waitFor } from '@testing-library/react-native'
import { ensureMediaToken, invalidateMediaToken } from '../store/mediaToken'
import { useMediaSrc } from './useMediaSrc'

jest.mock('../store/mediaToken', () => ({ ensureMediaToken: jest.fn(), invalidateMediaToken: jest.fn() }))

describe('useMediaSrc', () => {
  beforeEach(() => jest.clearAllMocks())

  it('inativo não pede token; ativo monta a URL', async () => {
    jest.mocked(ensureMediaToken).mockResolvedValue('tk')
    const { result, rerender } = await renderHook(({ on }: { on: boolean }) => useMediaSrc('m1', on), { initialProps: { on: false } })
    expect(ensureMediaToken).not.toHaveBeenCalled()
    await rerender({ on: true })
    await waitFor(() => expect(result.current.src).toMatch(/\/media\/m1\?token=tk$/))
  })

  it('erro: tenta de novo com token novo; na segunda falha, failed', async () => {
    jest.mocked(ensureMediaToken).mockResolvedValueOnce('t1').mockResolvedValueOnce('t2')
    const { result } = await renderHook(() => useMediaSrc('m1', true))
    await waitFor(() => expect(result.current.src).toContain('t1'))
    await act(async () => result.current.onError())
    expect(invalidateMediaToken).toHaveBeenCalledWith('t1')
    await waitFor(() => expect(result.current.src).toContain('t2'))
    await act(async () => result.current.onError())
    expect(result.current.failed).toBe(true)
  })

  it('falha ao pedir o token marca failed', async () => {
    jest.mocked(ensureMediaToken).mockRejectedValue(new Error('x'))
    const { result } = await renderHook(() => useMediaSrc('m1', true))
    await waitFor(() => expect(result.current.failed).toBe(true))
  })
})
