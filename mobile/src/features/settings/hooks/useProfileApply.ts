import * as ImagePicker from 'expo-image-picker'
import { useCallback, useState } from 'react'
import { commitMe } from '../../auth/store/accountActions'
import { useAuthStore } from '../../auth/store/authStore'
import { deleteProfileImage, uploadProfileImage, type ProfileImageKind } from '../../profile/api/profileImages'
import { imageFileError, type ProfileFields } from '../../profile/lib/profileValidation'
import { saveMyProfileFields } from '../../profile/store/myProfileActions'

// Proporção do recorte do seletor do sistema (o desktop tem um recorte próprio; o do GIF animado fica para depois).
const ASPECT: Record<ProfileImageKind, [number, number]> = { avatar: [1, 1], banner: [3, 1] }

const FAILED = 'Não foi possível salvar o perfil.'
const messageOf = (err: unknown): string => (err instanceof Error && err.message ? err.message : FAILED)

/**
 * Salva o perfil na hora, como o "Aplicar" do desktop: campos (texto, tema, estilo do nome) ou avatar e
 * banner (escolhe, recorta, sobe com progresso e remove). Devolve a mensagem de erro (null = salvou).
 */
export function useProfileApply() {
  const user = useAuthStore((s) => s.user)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)

  const run = useCallback(async (job: () => Promise<void>): Promise<string | null> => {
    setSaving(true)
    try {
      await job()
      return null
    } catch (err) {
      return messageOf(err)
    } finally {
      setSaving(false)
      setProgress(null)
    }
  }, [])

  const apply = useCallback((fields: Partial<ProfileFields>) => run(() => saveMyProfileFields(fields)), [run])

  const pickImage = useCallback(
    async (kind: ProfileImageKind): Promise<string | null> => {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: ASPECT[kind], quality: 1 })
      const asset = result.canceled ? undefined : result.assets[0]
      if (!asset) return null
      const file = { uri: asset.uri, name: asset.fileName ?? `${kind}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' }
      const invalid = imageFileError({ type: file.mimeType, size: asset.fileSize ?? 0 })
      if (invalid) return invalid
      return run(async () => commitMe(await uploadProfileImage(kind, file, setProgress)))
    },
    [run]
  )

  const removeImage = useCallback((kind: ProfileImageKind) => run(async () => commitMe(await deleteProfileImage(kind))), [run])

  return { user, saving, progress, apply, pickImage, removeImage }
}
