import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { Linking } from 'react-native'
import type { Attachment } from '../api/messages'
import { MessageAttachments } from './MessageAttachments'

jest.mock('../store/mediaToken', () => ({ ensureMediaToken: jest.fn().mockResolvedValue('tk'), invalidateMediaToken: jest.fn() }))

const att = (over: Partial<Attachment>): Attachment => ({ id: 'a1', kind: 'image', content_type: 'image/png', filename: 'foto.png', size_bytes: 1024, width: 800, height: 600, ...over })

describe('MessageAttachments', () => {
  it('imagem: carrega com o token e abre em tela cheia ao tocar', async () => {
    await render(<MessageAttachments attachments={[att({})]} />)
    const button = await screen.findByRole('imagebutton', { name: 'foto.png' })
    await waitFor(() => expect(screen.getByTestId('anexo-imagem').props.source.uri).toMatch(/\/media\/a1\?token=tk$/))
    await fireEvent.press(button)
    expect(await screen.findByLabelText('Fechar imagem')).toBeOnTheScreen()
    await fireEvent.press(screen.getByLabelText('Fechar'))
    await waitFor(() => expect(screen.queryByLabelText('Fechar imagem')).toBeNull())
  })

  it('imagem que falha duas vezes mostra o aviso', async () => {
    await render(<MessageAttachments attachments={[att({})]} />)
    const img = await waitFor(() => screen.getByTestId('anexo-imagem'))
    await fireEvent(img, 'error')
    await fireEvent(await waitFor(() => screen.getByTestId('anexo-imagem')), 'error')
    expect(await screen.findByText('Não foi possível carregar a imagem.')).toBeOnTheScreen()
  })

  it('áudio e vídeo: cartão com nome e tamanho; tocar abre o player do aparelho', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve(true as never))
    await render(
      <MessageAttachments
        attachments={[att({ id: 'v1', kind: 'video', filename: 'clipe.mp4', size_bytes: 5 * 1024 * 1024 }), att({ id: 'u1', kind: 'audio', filename: 'voz.mp3', size_bytes: 512 })]}
      />
    )
    expect(screen.getByText('5 MB')).toBeOnTheScreen()
    expect(screen.getByText('512 B')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Reproduzir clipe.mp4' }))
    await waitFor(() => expect(open).toHaveBeenCalledWith(expect.stringMatching(/\/media\/v1\?token=tk$/)))
  })
})
