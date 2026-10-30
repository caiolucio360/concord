import notifee, { AndroidForegroundServiceType, AndroidImportance } from '@notifee/react-native'
import type { ForegroundPort } from './callForeground'

// O único arquivo que fala com o notifee (ADR 0029), fora da cobertura do Jest como o livekitMedia.ts: a lógica
// de quando ligar e desligar fica em callForeground.ts, testada com uma porta falsa.

const CHANNEL = 'chamada-ativa'
const NOTIFICATION = 'chamada-ativa'

/**
 * Registra a tarefa do serviço: uma promessa que não termina mantém o JavaScript rodando com o app em segundo
 * plano (os timers do React Native, e com eles o ping do LiveKit, voltam a andar). Chamar uma vez, na carga do app.
 */
export function registerCallService(): void {
  notifee.registerForegroundService(() => new Promise<void>(() => {}))
}

export const notifeeForeground: ForegroundPort = {
  async start({ title }) {
    await notifee.createChannel({ id: CHANNEL, name: 'Chamada em andamento', importance: AndroidImportance.LOW })
    await notifee.displayNotification({
      id: NOTIFICATION,
      title: title || 'Chamada',
      body: 'Você está em uma chamada',
      android: {
        channelId: CHANNEL,
        asForegroundService: true,
        ongoing: true,
        foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MICROPHONE],
        pressAction: { id: 'default' }
      }
    })
  },
  async stop() {
    await notifee.stopForegroundService()
  }
}
