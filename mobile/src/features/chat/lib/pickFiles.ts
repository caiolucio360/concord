import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import type { PickedFile } from './attachments'

type Asset = ImagePicker.ImagePickerAsset

const toPicked = (a: Asset): PickedFile => ({
  uri: a.uri,
  name: a.fileName ?? a.uri.split('/').pop() ?? 'arquivo',
  mimeType: a.mimeType ?? '',
  size: a.fileSize ?? 0,
  ...(a.width ? { width: a.width } : {}),
  ...(a.height ? { height: a.height } : {}),
  ...(a.duration ? { duration_ms: Math.round(a.duration) } : {})
})

/** Fotos e vídeos da galeria (vários de uma vez). Cancelar devolve lista vazia. */
export async function pickFromGallery(): Promise<PickedFile[]> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 1 })
  return result.canceled ? [] : result.assets.map(toPicked)
}

/** Tira uma foto ou grava um vídeo na câmera; sem permissão ou cancelando, devolve lista vazia. */
export async function pickFromCamera(): Promise<PickedFile[]> {
  const permission = await ImagePicker.requestCameraPermissionsAsync()
  if (!permission.granted) return []
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], quality: 1 })
  return result.canceled ? [] : result.assets.map(toPicked)
}

/** Arquivos do aparelho (áudio, vídeo, imagem). */
export async function pickDocuments(): Promise<PickedFile[]> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'video/*', 'audio/*'], multiple: true, copyToCacheDirectory: true })
  if (result.canceled) return []
  return result.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? '', size: a.size ?? 0 }))
}
