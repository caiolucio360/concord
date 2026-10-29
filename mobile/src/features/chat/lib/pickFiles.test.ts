import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { pickDocuments, pickFromCamera, pickFromGallery } from './pickFiles'

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn()
}))
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }))

const asset = { uri: 'file:///x/foto.jpg', fileName: 'foto.jpg', mimeType: 'image/jpeg', fileSize: 500, width: 40, height: 30 }

describe('seletores de arquivo', () => {
  beforeEach(() => jest.clearAllMocks())

  it('galeria: converte os itens (medidas e duração incluídas); cancelar dá lista vazia', async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: false, assets: [asset, { uri: 'file:///x/v.mp4', duration: 1234.4 }] } as never)
    expect(await pickFromGallery()).toEqual([
      { uri: 'file:///x/foto.jpg', name: 'foto.jpg', mimeType: 'image/jpeg', size: 500, width: 40, height: 30 },
      { uri: 'file:///x/v.mp4', name: 'v.mp4', mimeType: '', size: 0, duration_ms: 1234 }
    ])
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({ canceled: true, assets: null } as never)
    expect(await pickFromGallery()).toEqual([])
  })

  it('câmera: sem permissão não abre; com permissão devolve a foto', async () => {
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValueOnce({ granted: false } as never)
    expect(await pickFromCamera()).toEqual([])
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled()
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValueOnce({ granted: true } as never)
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValueOnce({ canceled: false, assets: [asset] } as never)
    expect(await pickFromCamera()).toHaveLength(1)
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValueOnce({ granted: true } as never)
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValueOnce({ canceled: true, assets: null } as never)
    expect(await pickFromCamera()).toEqual([])
  })

  it('arquivos: converte; cancelar dá lista vazia', async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///a.mp3', name: 'a.mp3', mimeType: 'audio/mpeg', size: 9 }, { uri: 'file:///b.m4a', name: 'b.m4a' }] } as never)
    expect(await pickDocuments()).toEqual([
      { uri: 'file:///a.mp3', name: 'a.mp3', mimeType: 'audio/mpeg', size: 9 },
      { uri: 'file:///b.m4a', name: 'b.m4a', mimeType: '', size: 0 }
    ])
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValueOnce({ canceled: true } as never)
    expect(await pickDocuments()).toEqual([])
  })
})
