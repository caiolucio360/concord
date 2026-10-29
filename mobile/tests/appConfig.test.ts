import config from '../app.config'

describe('app.config (voz)', () => {
  it('declara as permissões de áudio e o serviço em primeiro plano de microfone', () => {
    expect(config.android?.permissions).toEqual(
      expect.arrayContaining([
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_MICROPHONE'
      ])
    )
  })

  it('declara o serviço de captura de tela (transmitir a tela, ADR 0027), mas ainda não pede a câmera da chamada', () => {
    const permissions = config.android?.permissions ?? []
    expect(permissions).toContain('android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION')
    expect(permissions).not.toContain('android.permission.CAMERA')
  })

  it('registra os plugins nativos do LiveKit e do WebRTC', () => {
    const names = (config.plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p))
    expect(names).toEqual(expect.arrayContaining(['@livekit/react-native-expo-plugin', '@config-plugins/react-native-webrtc']))
  })

  it('registra o seletor de imagens com o texto da permissão da câmera (sem pedir microfone)', () => {
    const entry = (config.plugins ?? []).find((p) => Array.isArray(p) && p[0] === 'expo-image-picker') as [string, Record<string, unknown>]
    expect(entry[1]).toMatchObject({ microphonePermission: false })
    expect(String(entry[1].cameraPermission)).toMatch(/câmera/)
  })

  it('aplica as regras do R8 que o build de release exige (LiveKit)', () => {
    const mods = (config as { mods?: { android?: { dangerous?: unknown } } }).mods
    expect(mods?.android?.dangerous).toBeDefined()
  })
})
