import { uploadFile } from '../../../shared/api/upload'
import { roomPath, uploadAttachment } from './upload'

jest.mock('../../../shared/api/upload', () => ({ uploadFile: jest.fn().mockResolvedValue({ id: 'att1' }) }))

const picked = { uri: 'file:///a.png', name: 'a.png', mimeType: 'image/png', size: 10 }

describe('upload de anexo do chat', () => {
  it('roomPath: canal e conversa', () => {
    expect(roomPath('channel:c1')).toBe('/channels/c1')
    expect(roomPath('conversation:d1')).toBe('/conversations/d1')
  })

  it('manda largura, altura e duração (quando há) como campos, para a rota da sala', async () => {
    const opts = { onProgress: jest.fn() }
    await expect(uploadAttachment('channel:c1', { ...picked, width: 4, height: 3, duration_ms: 90 }, opts)).resolves.toEqual({ id: 'att1' })
    expect(uploadFile).toHaveBeenCalledWith('/channels/c1/attachments', expect.objectContaining({ name: 'a.png' }), { width: '4', height: '3', duration_ms: '90' }, opts)
  })

  it('sem medidas, sem campos', async () => {
    await uploadAttachment('conversation:d1', picked)
    expect(uploadFile).toHaveBeenLastCalledWith('/conversations/d1/attachments', expect.anything(), {}, {})
  })
})
