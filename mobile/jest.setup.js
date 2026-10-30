// Os ícones do @expo/vector-icons carregam fonte/asset que o Jest não registra.
jest.mock('@expo/vector-icons', () => ({ Ionicons: Object.assign(() => null, { glyphMap: {} }) }))

// O módulo nativo de notificações não existe no Jest; o comportamento real é coberto por testes com portas.
jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('id-local'),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  getDevicePushTokenAsync: jest.fn().mockResolvedValue({ type: 'android', data: 'tok-test' }),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  clearLastNotificationResponseAsync: jest.fn().mockResolvedValue(undefined)
}))

// Módulos nativos de WebRTC/LiveKit não existem no Jest; a lógica da chamada usa uma CallMedia falsa (ADR 0023).
jest.mock('@livekit/react-native', () => ({
  registerGlobals: jest.fn(),
  AudioSession: { startAudioSession: jest.fn().mockResolvedValue(undefined), stopAudioSession: jest.fn().mockResolvedValue(undefined) }
}))
jest.mock('livekit-client', () => ({
  Room: jest.fn(),
  RoomEvent: {},
  ConnectionState: { Disconnected: 'disconnected' }
}))

// O Skia é módulo nativo: no Jest vem de um mock que grava as chamadas (tests/mocks/skia.ts).
jest.mock('@shopify/react-native-skia', () => require('./tests/mocks/skia'))

// O Reanimated é módulo nativo: no Jest só o useSharedValue é usado (o efeito do perfil grava a picture nele).
jest.mock('react-native-reanimated', () => ({
  useSharedValue: (initial) => {
    const { useRef } = require('react')
    const ref = useRef(null)
    if (ref.current === null) ref.current = { value: initial }
    return ref.current
  }
}))

// Áudio nativo não existe no Jest; o player de sons é testado com uma porta falsa (soundPlayer.test.ts).
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn(() => ({ seekTo: jest.fn(), play: jest.fn() })) }))

// O notifee é módulo nativo: no Jest a lógica usa uma porta falsa (callForeground); aqui só para importar sem erro.
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: { registerForegroundService: jest.fn(), createChannel: jest.fn(), displayNotification: jest.fn(), stopForegroundService: jest.fn() },
  AndroidImportance: { LOW: 2 },
  AndroidForegroundServiceType: { FOREGROUND_SERVICE_TYPE_MICROPHONE: 128 }
}))
