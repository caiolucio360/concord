import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { useNetworkStore } from '../../../shared/store/networkStore'
import type { SendOutcome } from '../hooks/useRoomMessages'
import { Composer } from './Composer'

jest.mock('../hooks/useGifSearch', () => ({
  useGifSearch: () => ({ gifs: [{ id: 'g1', title: 'gatinho', url: 'https://g/u.gif', preview_url: 'https://g/p.gif', width: 200, height: 100 }], loading: false })
}))
jest.mock('../hooks/useServerStickers', () => ({
  useServerStickers: (serverId: string | null | undefined) => ({
    stickers: serverId ? [{ id: 's1', server_id: serverId, uploader_id: 'u', name: 'oi', content_type: 'image/png', size_bytes: 1, created_at: '' }] : [],
    loading: false
  })
}))
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }))
jest.mock('../store/mediaToken', () => ({ ensureMediaToken: jest.fn().mockResolvedValue('tk'), invalidateMediaToken: jest.fn() }))

const type = (text: string) => fireEvent.changeText(screen.getByLabelText('Mensagem para #geral'), text)
const press = () => fireEvent.press(screen.getByRole('button', { name: 'Enviar' }))
const FORBIDDEN = 'Você não tem permissão para enviar mensagens neste canal.'
const setup = (onSend: (t: string) => Promise<SendOutcome>, forbiddenNotice: string | null = FORBIDDEN) =>
  render(<Composer label="Mensagem para #geral" onSend={onSend} forbiddenNotice={forbiddenNotice ?? undefined} />)

describe('Composer', () => {
  beforeEach(() => useNetworkStore.setState({ online: true }))

  it('canal de servidor: digitar "/" sugere os comandos do Maestro e tocar completa', async () => {
    await render(<Composer label="Mensagem para #geral" serverId="sv" onSend={jest.fn()} />)
    await type('/pl')
    await fireEvent.press(screen.getByRole('button', { name: '/play <link ou nome>' }))
    expect(screen.getByLabelText('Mensagem para #geral').props.value).toBe('/play ')
  })

  it('DM (sem servidor): não sugere comandos do Maestro', async () => {
    await setup(jest.fn())
    await type('/pl')
    expect(screen.queryByRole('button', { name: '/play <link ou nome>' })).toBeNull()
  })

  const openPicker = () => fireEvent.press(screen.getByRole('button', { name: 'Emojis, GIFs e figurinhas' }))

  it('seletor: emoji entra no texto e fecha o seletor', async () => {
    await setup(jest.fn())
    await openPicker()
    await fireEvent.press(await screen.findByRole('button', { name: 'Joinha' }))
    expect(screen.getByLabelText('Mensagem para #geral').props.value).toBe('👍')
    expect(screen.queryByRole('tablist')).toBeNull()
  })

  it('seletor: escolher um GIF envia na hora com a URL e as medidas', async () => {
    const onSend = jest.fn().mockResolvedValue('ok')
    await setup(onSend)
    await openPicker()
    await fireEvent.press(await screen.findByRole('tab', { name: /GIFs/ }))
    await fireEvent.press(screen.getByRole('button', { name: 'gatinho' }))
    await waitFor(() =>
      expect(onSend).toHaveBeenCalledWith('', { gifUrl: 'https://g/u.gif', gifMetadata: { width: 200, height: 100, preview_url: 'https://g/p.gif' } })
    )
  })

  it('seletor: figurinha do servidor envia o id', async () => {
    const onSend = jest.fn().mockResolvedValue('ok')
    await render(<Composer label="Mensagem para #geral" serverId="sv" onSend={onSend} />)
    await openPicker()
    await fireEvent.press(await screen.findByRole('tab', { name: /Figurinhas/ }))
    await fireEvent.press(await screen.findByRole('button', { name: 'oi' }))
    await waitFor(() => expect(onSend).toHaveBeenCalledWith('', { stickerId: 's1' }))
  })

  it('seletor na DM: avisa que figurinhas são dos servidores', async () => {
    await setup(jest.fn())
    await openPicker()
    await fireEvent.press(await screen.findByRole('tab', { name: /Figurinhas/ }))
    expect(screen.getByText('Figurinhas ficam disponíveis em canais de servidores.')).toBeOnTheScreen()
  })

  it('seletor: falha ao enviar o GIF mostra o aviso', async () => {
    await setup(jest.fn().mockResolvedValue('error'))
    await openPicker()
    await fireEvent.press(await screen.findByRole('tab', { name: /GIFs/ }))
    await fireEvent.press(screen.getByRole('button', { name: 'gatinho' }))
    expect(await screen.findByText('Não foi possível enviar. Tente de novo.')).toBeOnTheScreen()
  })

  it('enviar chama onSend com o texto e limpa o campo', async () => {
    const onSend = jest.fn().mockResolvedValue('ok')
    await setup(onSend)
    await type('oi')
    await press()
    await waitFor(() => expect(onSend).toHaveBeenCalledWith('oi'))
    await waitFor(() => expect(screen.getByLabelText('Mensagem para #geral').props.value).toBe(''))
  })

  it('campo vazio: botão desativado', async () => {
    await setup(jest.fn())
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
    await type('   ')
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('falha: o texto volta ao campo e aparece o aviso', async () => {
    await setup(jest.fn().mockResolvedValue('error'))
    await type('oi')
    await press()
    expect(await screen.findByText('Não foi possível enviar. Tente de novo.')).toBeOnTheScreen()
    expect(screen.getByLabelText('Mensagem para #geral').props.value).toBe('oi')
  })

  it('403: aviso de permissão', async () => {
    await setup(jest.fn().mockResolvedValue('forbidden'))
    await type('oi')
    await press()
    expect(await screen.findByText('Você não tem permissão para enviar mensagens neste canal.')).toBeOnTheScreen()
  })

  it('403 sem texto próprio (DM): cai no aviso genérico de falha', async () => {
    await setup(jest.fn().mockResolvedValue('forbidden'), null)
    await type('oi')
    await press()
    expect(await screen.findByText('Não foi possível enviar. Tente de novo.')).toBeOnTheScreen()
  })

  it('sem rede: botão desativado mesmo com texto', async () => {
    useNetworkStore.setState({ online: false })
    await setup(jest.fn())
    await type('oi')
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled()
  })

  it('durante o envio o botão fica desativado (sem envio duplo)', async () => {
    let finish: (o: SendOutcome) => void = () => {}
    const onSend = jest.fn().mockReturnValue(new Promise((r) => (finish = r)))
    await setup(onSend)
    await type('oi')
    const pressing = press()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled())
    finish('ok')
    await pressing
    expect(onSend).toHaveBeenCalledTimes(1)
  })
})
