import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { fetchChangelog, type ChangelogRelease } from '../api/changelog'
import { ChangelogScreen } from './ChangelogScreen'

jest.mock('../api/changelog', () => ({ fetchChangelog: jest.fn() }))
const fetchMock = fetchChangelog as jest.Mock

const release: ChangelogRelease = {
  version: '1.4.0',
  released_at: '2026-10-29T12:00:00Z',
  summary: 'Chegou o app.',
  entries: [
    { kind: 'feature', text: 'Chamadas de voz' },
    { kind: 'fix', text: 'Notificações em segundo plano' }
  ]
}

describe('ChangelogScreen', () => {
  beforeEach(() => jest.clearAllMocks())

  it('lista as versões com novidades e correções', async () => {
    fetchMock.mockResolvedValue([release])
    await render(<ChangelogScreen onBack={() => {}} />)
    expect(await screen.findByText('v1.4.0')).toBeOnTheScreen()
    expect(screen.getByText('Chegou o app.')).toBeOnTheScreen()
    expect(screen.getByText('Chamadas de voz')).toBeOnTheScreen()
    expect(screen.getByText('Notificações em segundo plano')).toBeOnTheScreen()
  })

  it('não lista versões sem notas', async () => {
    fetchMock.mockResolvedValue([{ ...release, version: '1.5.0', summary: '', entries: [] }, release])
    await render(<ChangelogScreen onBack={() => {}} />)
    expect(await screen.findByText('v1.4.0')).toBeOnTheScreen()
    expect(screen.queryByText('v1.5.0')).not.toBeOnTheScreen()
  })

  it('sem versões publicadas, avisa', async () => {
    fetchMock.mockResolvedValue([])
    await render(<ChangelogScreen onBack={() => {}} />)
    expect(await screen.findByText('Nenhuma versão publicada ainda.')).toBeOnTheScreen()
  })

  it('erro de rede mostra o aviso e permite tentar de novo', async () => {
    fetchMock.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce([release])
    await render(<ChangelogScreen onBack={() => {}} />)
    expect(await screen.findByText('Não foi possível carregar as novidades.')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(screen.getByText('v1.4.0')).toBeOnTheScreen())
  })

  it('voltar chama onBack', async () => {
    fetchMock.mockResolvedValue([])
    const onBack = jest.fn()
    await render(<ChangelogScreen onBack={onBack} />)
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }))
    expect(onBack).toHaveBeenCalled()
  })
})
