import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import * as ImagePicker from 'expo-image-picker'
import { useAuthStore } from '../../../auth/store/authStore'
import { deleteProfileImage, uploadProfileImage } from '../../../profile/api/profileImages'
import { updateProfile } from '../../../profile/api/users'
import { ProfilesSection } from './ProfilesSection'

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }))
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }))
jest.mock('../../../profile/api/users', () => ({ updateProfile: jest.fn(), getProfile: jest.fn() }))
jest.mock('../../../profile/api/profileImages', () => ({ uploadProfileImage: jest.fn(), deleteProfileImage: jest.fn() }))
jest.mock('../../../levels/api/levels', () => ({ fetchLevels: jest.fn().mockResolvedValue({}), fetchMyLevel: jest.fn() }))
jest.mock('../../../levels/api/badges', () => ({ fetchBadges: jest.fn().mockResolvedValue({ badges: [] }) }))

const user = { id: 'u1', username: 'ana', display_name: 'Ana', email: 'a@b.co', bio: 'Oi', avatar_url: '/api/profile-media/a', banner_url: '/api/profile-media/b' }
const tile = (label: string) => fireEvent.press(screen.getByRole('button', { name: label }))
const apply = () => fireEvent.press(screen.getByRole('button', { name: 'Aplicar' }))

describe('ProfilesSection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({ ...useAuthStore.getInitialState(), status: 'signedIn', user })
    jest.mocked(updateProfile).mockImplementation(async (f) => ({ ...user, display_name: f.display_name, pronouns: f.pronouns, bio: f.bio, status_text: f.status_text, banner_color: f.banner_color, name_style: f.name_style, profile_theme: f.profile_theme, links: f.links.map((url) => ({ url })) }))
  })

  it('mostra os blocos com o valor atual ou o convite', async () => {
    await render(<ProfilesSection />)
    expect(screen.getAllByText('Oi').length).toBeGreaterThan(1)
    expect(screen.getByRole('button', { name: 'Editar pronomes' })).toBeOnTheScreen()
    expect(screen.getAllByText('Padrão').length).toBeGreaterThan(0)
  })

  it('pronomes: edita com contador, aplica e salva na hora', async () => {
    await render(<ProfilesSection />)
    await tile('Editar pronomes')
    await fireEvent.changeText(screen.getByLabelText('Pronomes'), 'ela/dela')
    expect(screen.getByText('8/40')).toBeOnTheScreen()
    await apply()
    await waitFor(() => expect(useAuthStore.getState().user?.pronouns).toBe('ela/dela'))
    expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ pronouns: 'ela/dela', display_name: 'Ana', bio: 'Oi' }))
  })

  it('sobre mim acima do limite bloqueia o Aplicar e mostra o erro', async () => {
    await render(<ProfilesSection />)
    await tile('Editar sobre mim')
    await fireEvent.changeText(screen.getByLabelText('Sobre mim'), 'a'.repeat(200))
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled()
  })

  it('links: adiciona, valida, remove e respeita o máximo de 5', async () => {
    await render(<ProfilesSection />)
    await tile('Editar links')
    for (let i = 0; i < 5; i++) await fireEvent.press(screen.getByRole('button', { name: 'Adicionar link' }))
    expect(screen.getByRole('button', { name: 'Adicionar link' })).toBeDisabled()
    expect(screen.getByText('Máximo de 5 links.')).toBeOnTheScreen()
    await fireEvent.changeText(screen.getByLabelText('Link 1'), 'github.com/ana')
    await fireEvent.press(screen.getByRole('button', { name: 'Remover link 5' }))
    expect(screen.queryByLabelText('Link 5')).toBeNull()
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled()
  })

  it('erro do servidor aparece e o modal fica aberto; cancelar fecha', async () => {
    jest.mocked(updateProfile).mockRejectedValue(new Error('Servidor fora'))
    await render(<ProfilesSection />)
    await tile('Editar nota')
    await fireEvent.changeText(screen.getByLabelText('Nota'), 'codando')
    await apply()
    expect(await screen.findByText('Servidor fora')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByText('Servidor fora')).toBeNull())
  })

  it('cor do banner: escolhe da paleta, vira "Padrão" de novo ao usar a cor padrão', async () => {
    await render(<ProfilesSection />)
    await tile('Mudar a cor do banner')
    await fireEvent.press(screen.getByRole('button', { name: 'Cor do banner' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Cor do banner: #dc2626' }))
    await fireEvent.changeText(screen.getByLabelText('Cor do banner (código)'), '#00ff00')
    await apply()
    await waitFor(() => expect(useAuthStore.getState().user?.banner_color).toBe('#00ff00'))
  })

  it('nome e estilo: troca o efeito, completa as cores e o Surpreenda-me sorteia', async () => {
    await render(<ProfilesSection />)
    await tile('Editar nome de exibição e estilo')
    await fireEvent.changeText(screen.getByLabelText('Nome de exibição'), 'Ana Maria')
    await fireEvent.press(screen.getByRole('radio', { name: 'Degradê' }))
    expect(screen.getByRole('button', { name: 'Cor 2' })).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Surpreenda-me' }))
    await apply()
    await waitFor(() => expect(useAuthStore.getState().user?.display_name).toBe('Ana Maria'))
  })

  it('tema: escolhe predefinição, ajusta borda e efeito', async () => {
    await render(<ProfilesSection />)
    await tile('Mudar o tema do perfil')
    await fireEvent.press(screen.getByRole('radio', { name: 'Neon' }))
    expect(screen.getByRole('button', { name: 'Diminuir espessura' })).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar espessura' }))
    await fireEvent.press(screen.getByRole('radio', { name: 'Fogo' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar quantidade' }))
    await fireEvent.press(screen.getAllByRole('radio', { name: 'Degradê' }).at(-1)!)
    await apply()
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ profile_theme: expect.objectContaining({ effect: 'fire', border: 'neon' }) })))
  })

  it('avatar: escolhe no seletor, sobe e atualiza a conta; cancelar não faz nada', async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: true, assets: null } as never)
    await render(<ProfilesSection />)
    await tile('Alterar avatar')
    expect(uploadProfileImage).not.toHaveBeenCalled()
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///a.jpg', fileName: 'a.jpg', mimeType: 'image/jpeg', fileSize: 1000 }] } as never)
    jest.mocked(uploadProfileImage).mockResolvedValue({ ...user, avatar_url: '/api/profile-media/novo' })
    await tile('Alterar avatar')
    await waitFor(() => expect(useAuthStore.getState().user?.avatar_url).toBe('/api/profile-media/novo'))
  })

  it('imagem grande demais ou de tipo não aceito mostra o aviso sem subir', async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///a.bmp', mimeType: 'image/bmp', fileSize: 10 }] } as never)
    await render(<ProfilesSection />)
    await tile('Alterar banner')
    expect(await screen.findByText('Use uma imagem PNG, JPG, GIF ou WebP.')).toBeOnTheScreen()
    expect(uploadProfileImage).not.toHaveBeenCalled()
  })

  it('falha no upload mostra o motivo', async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///a.png', mimeType: 'image/png', fileSize: 10 }] } as never)
    jest.mocked(uploadProfileImage).mockRejectedValue(new Error('A imagem pode ter até 10 MB.'))
    await render(<ProfilesSection />)
    await tile('Alterar avatar')
    expect(await screen.findByText('A imagem pode ter até 10 MB.')).toBeOnTheScreen()
  })

  it('remover pede confirmação e só então apaga', async () => {
    jest.mocked(deleteProfileImage).mockResolvedValue({ ...user, banner_url: null })
    await render(<ProfilesSection />)
    await tile('Remover banner')
    expect(deleteProfileImage).not.toHaveBeenCalled()
    await fireEvent.press(screen.getAllByRole('button', { name: 'Remover banner' }).at(-1)!)
    await waitFor(() => expect(deleteProfileImage).toHaveBeenCalledWith('banner'))
    await act(async () => {})
    expect(useAuthStore.getState().user?.banner_url).toBeNull()
  })
})
