import * as Notifications from 'expo-notifications'
import { PermissionsAndroid, Platform } from 'react-native'

/** Uma permissão do aparelho que o app usa, com a pergunta e o pedido (portas para o teste). */
export interface PermissionPort {
  name: string
  isGranted: () => Promise<boolean>
  request: () => Promise<boolean>
}

function androidPermission(name: string, permission: Parameters<typeof PermissionsAndroid.check>[0]): PermissionPort {
  return {
    name,
    isGranted: () => PermissionsAndroid.check(permission),
    request: async () => (await PermissionsAndroid.request(permission)) === PermissionsAndroid.RESULTS.GRANTED
  }
}

/** As permissões que o app precisa, na ordem em que o Android as pergunta logo depois do login. */
export const STARTUP_PERMISSIONS: PermissionPort[] = [
  {
    name: 'notificações',
    isGranted: async () => (await Notifications.getPermissionsAsync()).granted,
    request: async () => (await Notifications.requestPermissionsAsync()).granted
  },
  androidPermission('microfone', PermissionsAndroid.PERMISSIONS.RECORD_AUDIO),
  androidPermission('câmera', PermissionsAndroid.PERMISSIONS.CAMERA)
]

/**
 * Pede, uma de cada vez, o que ainda não foi concedido. Negar não trava nada: o app segue e cada recurso
 * avisa quando precisar (ex.: a chamada entra só ouvindo). Erro do sistema numa permissão não impede as outras.
 */
export async function askStartupPermissions(ports: PermissionPort[] = STARTUP_PERMISSIONS, platform: string = Platform.OS): Promise<string[]> {
  if (platform !== 'android') return []
  const denied: string[] = []
  for (const port of ports) {
    try {
      if (await port.isGranted()) continue
      if (!(await port.request())) denied.push(port.name)
    } catch {
      denied.push(port.name)
    }
  }
  return denied
}
