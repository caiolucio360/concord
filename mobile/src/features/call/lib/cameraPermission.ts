import { PermissionsAndroid } from 'react-native'

/** Pede a câmera ao Android. Falso se a pessoa negou: a câmera da chamada fica desligada. */
export async function ensureCameraPermission(): Promise<boolean> {
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
  return result === PermissionsAndroid.RESULTS.GRANTED
}
