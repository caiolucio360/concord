import { renderHook, waitFor } from '@testing-library/react-native'
import { fetchServerStickers } from '../api/stickers'
import { useServerStickers } from './useServerStickers'

jest.mock('../api/stickers', () => ({ fetchServerStickers: jest.fn() }))
const stk = { id: 's1', server_id: 'sv', uploader_id: 'u', name: 'oi', content_type: 'image/png', size_bytes: 1, created_at: '' }

describe('useServerStickers', () => {
  beforeEach(() => jest.clearAllMocks())

  it('sem servidor (DM) ou fechado, não busca', async () => {
    const { result } = await renderHook(() => useServerStickers(null, true))
    expect(result.current).toEqual({ stickers: [], loading: false })
    await renderHook(() => useServerStickers('sv', false))
    expect(fetchServerStickers).not.toHaveBeenCalled()
  })

  it('carrega as figurinhas do servidor; falha vira lista vazia', async () => {
    jest.mocked(fetchServerStickers).mockResolvedValue([stk])
    const { result } = await renderHook(() => useServerStickers('sv', true))
    await waitFor(() => expect(result.current.stickers).toEqual([stk]))
    jest.mocked(fetchServerStickers).mockRejectedValue(new Error('x'))
    const failed = await renderHook(() => useServerStickers('sv2', true))
    await waitFor(() => expect(failed.result.current.loading).toBe(false))
    expect(failed.result.current.stickers).toEqual([])
  })
})
