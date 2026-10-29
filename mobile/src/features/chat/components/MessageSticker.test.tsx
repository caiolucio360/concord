import { fireEvent, render, screen } from '@testing-library/react-native'
import { ensureMediaToken } from '../store/mediaToken'
import { MessageSticker } from './MessageSticker'

jest.mock('../store/mediaToken', () => ({ ensureMediaToken: jest.fn() }))
const sticker = { id: 's1', server_id: 'sv', name: 'oi', content_type: 'image/png' }

describe('MessageSticker', () => {
  it('baixa com o token de mídia', async () => {
    jest.mocked(ensureMediaToken).mockResolvedValue('tk')
    await render(<MessageSticker sticker={sticker} />)
    const img = await screen.findByLabelText('oi')
    expect(img.props.source.uri).toMatch(/\/stickers\/s1\/file\?token=tk$/)
  })

  it('sem token: "Figurinha indisponível"', async () => {
    jest.mocked(ensureMediaToken).mockRejectedValue(new Error('x'))
    await render(<MessageSticker sticker={sticker} />)
    expect(await screen.findByText('Figurinha indisponível')).toBeOnTheScreen()
  })

  it('imagem que falha também vira "indisponível"', async () => {
    jest.mocked(ensureMediaToken).mockResolvedValue('tk')
    await render(<MessageSticker sticker={sticker} />)
    await fireEvent(await screen.findByLabelText('oi'), 'error')
    expect(screen.getByText('Figurinha indisponível')).toBeOnTheScreen()
  })
})
