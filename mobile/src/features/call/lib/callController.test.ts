import { ApiError } from '../../../shared/api/client'
import { useCallNoticeStore } from '../store/callNoticeStore'
import { useCallSessionStore } from '../store/callSessionStore'
import { useIncomingCallStore } from '../store/incomingCallStore'
import { useParticipantsStore } from '../store/participantsStore'
import { useScreenShareStore } from '../store/screenShareStore'
import { useSpeakingStore } from '../store/speakingStore'
import type { CallMedia, MediaConnection } from './callMedia'
import { createCallController, type ControllerDeps } from './callController'

import { playSound } from './sounds/soundPlayer'

jest.mock('./sounds/soundPlayer', () => ({ playSound: jest.fn() }))

const ana = { id: 'u1', username: 'ana', display_name: 'Ana' }
const session = () => useCallSessionStore.getState()

function rig(over: Partial<ControllerDeps> = {}) {
  let connection: (s: MediaConnection) => void = () => {}
  let speakers: (ids: string[]) => void = () => {}
  let screens: (ids: string[]) => void = () => {}
  const media: jest.Mocked<CallMedia> = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    setMicEnabled: jest.fn().mockResolvedValue(undefined),
    setListening: jest.fn(),
    setScreenShareEnabled: jest.fn().mockResolvedValue(undefined),
    watchScreen: jest.fn(),
    onScreens: jest.fn((l) => {
      screens = l
      return () => {}
    }),
    onSpeakers: jest.fn((l) => {
      speakers = l
      return () => {}
    }),
    onConnection: jest.fn((l) => {
      connection = l
      return () => {}
    })
  }
  const deps: ControllerDeps = {
    api: {
      startCall: jest.fn().mockResolvedValue({ id: 'c1', type: 'channel', status: 'active' }),
      getCallToken: jest.fn().mockResolvedValue({ token: 'tok' }),
      endCallRequest: jest.fn().mockResolvedValue({ message: 'ok' })
    },
    media,
    ws: { send: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() },
    liveKitUrl: 'wss://sala.exemplo',
    controls: () => ({ muted: false, deafened: false }),
    ensureMicPermission: jest.fn().mockResolvedValue(true),
    ...over
  }
  return { deps, media, controller: createCallController(deps), emitConnection: (s: MediaConnection) => connection(s), emitSpeakers: (ids: string[]) => speakers(ids), emitScreens: (ids: string[]) => screens(ids) }
}

beforeEach(() => {
  session().reset()
  useParticipantsStore.getState().reset()
  useIncomingCallStore.getState().clear()
  useCallNoticeStore.getState().dismiss()
  useSpeakingStore.getState().reset()
  useScreenShareStore.getState().reset()
})

describe('joinChannel', () => {
  it('cria a chamada, assina a sala, conecta a mídia e fica ativa', async () => {
    const { controller, deps, media } = rig()
    await controller.joinChannel({ id: 'ch1', name: 'Geral', serverId: 's1' })
    expect(deps.api.startCall).toHaveBeenCalledWith({ type: 'channel', channel_id: 'ch1' })
    expect(deps.ws.subscribe).toHaveBeenCalledWith('call:c1')
    expect(media.connect).toHaveBeenCalledWith('wss://sala.exemplo', 'tok')
    expect(session()).toMatchObject({ phase: 'active', callId: 'c1', kind: 'channel', channelId: 'ch1', serverId: 's1', name: 'Geral' })
  })

  it('liga o microfone conforme o mudo local e avisa o servidor', async () => {
    const { controller, deps, media } = rig({ controls: () => ({ muted: true, deafened: false }) })
    await controller.joinChannel({ id: 'ch1', name: 'Geral', serverId: 's1' })
    expect(media.setMicEnabled).toHaveBeenLastCalledWith(false)
    expect(deps.ws.send).toHaveBeenCalledWith('call:voice', { call_id: 'c1', muted: true, deafened: false })
  })

  it('sala trancada: avisa e volta a ocioso sem conectar', async () => {
    const { controller, media, deps } = rig()
    ;(deps.api.startCall as jest.Mock).mockRejectedValue(new ApiError(423, 'call_locked'))
    await controller.joinChannel({ id: 'ch1', name: 'Geral', serverId: 's1' })
    expect(session().phase).toBe('idle')
    expect(media.connect).not.toHaveBeenCalled()
    expect(useCallNoticeStore.getState().message).toBe('Sala trancada. Peça para alguém abrir.')
  })

  it('falha da mídia sai da chamada e avisa', async () => {
    const { controller, media, deps } = rig()
    media.connect.mockRejectedValue(new Error('sem rede'))
    await controller.joinChannel({ id: 'ch1', name: 'Geral', serverId: 's1' })
    expect(session().phase).toBe('idle')
    expect(deps.ws.send).toHaveBeenCalledWith('call:leave', { call_id: 'c1' })
    expect(useCallNoticeStore.getState().message).toBe('Não foi possível entrar na chamada. Tente de novo.')
  })

  it('permissão de microfone negada: entra mudo e avisa', async () => {
    const { controller, media } = rig({ ensureMicPermission: jest.fn().mockResolvedValue(false) })
    await controller.joinChannel({ id: 'ch1', name: 'Geral', serverId: 's1' })
    expect(session().phase).toBe('active')
    expect(media.setMicEnabled).toHaveBeenLastCalledWith(false)
    expect(useCallNoticeStore.getState().message).toBe('Sem permissão do microfone. Você entrou mudo.')
  })

  it('entrar no mesmo canal de novo não faz nada', async () => {
    const { controller, deps } = rig()
    await controller.joinChannel({ id: 'ch1', name: 'Geral', serverId: 's1' })
    await controller.joinChannel({ id: 'ch1', name: 'Geral', serverId: 's1' })
    expect(deps.api.startCall).toHaveBeenCalledTimes(1)
  })

  it('entrar em outro canal sai do anterior primeiro', async () => {
    const { controller, deps } = rig()
    await controller.joinChannel({ id: 'ch1', name: 'Geral', serverId: 's1' })
    ;(deps.api.startCall as jest.Mock).mockResolvedValue({ id: 'c2', type: 'channel', status: 'active' })
    await controller.joinChannel({ id: 'ch2', name: 'Jogos', serverId: 's1' })
    expect(deps.ws.send).toHaveBeenCalledWith('call:leave', { call_id: 'c1' })
    expect(session()).toMatchObject({ callId: 'c2', channelId: 'ch2' })
  })
})

describe('callDm / accept / decline', () => {
  it('ligar para DM fica chamando sem conectar a mídia', async () => {
    const { controller, media, deps } = rig()
    ;(deps.api.startCall as jest.Mock).mockResolvedValue({ id: 'd1', type: 'dm', status: 'ringing' })
    await controller.callDm({ id: 'cv1', name: 'Ana' })
    expect(deps.api.startCall).toHaveBeenCalledWith({ type: 'dm', conversation_id: 'cv1' })
    expect(session()).toMatchObject({ phase: 'outgoing', callId: 'd1', kind: 'dm', conversationId: 'cv1', name: 'Ana' })
    expect(media.connect).not.toHaveBeenCalled()
  })

  it('quando atendem (fase connecting) a mídia conecta', async () => {
    const { controller, media, deps } = rig()
    ;(deps.api.startCall as jest.Mock).mockResolvedValue({ id: 'd1', type: 'dm', status: 'ringing' })
    await controller.callDm({ id: 'cv1', name: 'Ana' })
    session().setPhase('connecting')
    await controller.connectIfNeeded()
    expect(media.connect).toHaveBeenCalled()
    expect(session().phase).toBe('active')
  })

  it('atender: avisa o servidor, assina a sala e conecta', async () => {
    const { controller, deps, media } = rig()
    useIncomingCallStore.getState().ring({ callId: 'd9', conversationId: 'cv1', initiator: ana })
    await controller.acceptIncoming()
    expect(deps.ws.send).toHaveBeenCalledWith('call:accept', { call_id: 'd9' })
    expect(deps.ws.subscribe).toHaveBeenCalledWith('call:d9')
    expect(media.connect).toHaveBeenCalled()
    expect(useIncomingCallStore.getState().call).toBeNull()
    expect(session()).toMatchObject({ callId: 'd9', kind: 'dm', name: 'Ana', phase: 'active' })
  })

  it('recusar avisa o servidor e limpa', () => {
    const { controller, deps } = rig()
    useIncomingCallStore.getState().ring({ callId: 'd9', conversationId: 'cv1', initiator: ana })
    controller.declineIncoming()
    expect(deps.ws.send).toHaveBeenCalledWith('call:decline', { call_id: 'd9' })
    expect(useIncomingCallStore.getState().call).toBeNull()
  })
})

describe('leave e mídia', () => {
  it('toca o som de entrar ao conectar e o de sair ao sair da chamada ativa', async () => {
    const { controller } = rig()
    jest.mocked(playSound).mockClear()
    await controller.joinChannel({ id: 'ch1', name: 'Geral', serverId: 's1' })
    expect(playSound).toHaveBeenCalledWith('join')
    await controller.leave()
    expect(playSound).toHaveBeenLastCalledWith('leave')
  })

  it('sair de uma chamada que nem conectou não toca o som de sair', async () => {
    const { controller } = rig()
    await controller.callDm({ id: 'cv1', name: 'Ana' })
    jest.mocked(playSound).mockClear()
    await controller.leave()
    expect(playSound).not.toHaveBeenCalled()
  })

  it('sair avisa, desassina, desconecta e zera tudo', async () => {
    const { controller, deps, media } = rig()
    await controller.joinChannel({ id: 'ch1', name: 'Geral', serverId: 's1' })
    useParticipantsStore.getState().upsert(ana)
    await controller.leave()
    expect(deps.ws.send).toHaveBeenCalledWith('call:leave', { call_id: 'c1' })
    expect(deps.ws.unsubscribe).toHaveBeenCalledWith('call:c1')
    expect(media.disconnect).toHaveBeenCalled()
    expect(session().phase).toBe('idle')
    expect(useParticipantsStore.getState().people).toEqual([])
  })

  it('sair sem chamada não faz nada', async () => {
    const { controller, deps } = rig()
    await controller.leave()
    expect(deps.ws.send).not.toHaveBeenCalled()
  })

  it('mídia reconectando e voltando muda a fase', async () => {
    const { controller, emitConnection } = rig()
    await controller.joinChannel({ id: 'ch1', name: 'Geral', serverId: 's1' })
    emitConnection('reconnecting')
    expect(session().phase).toBe('reconnecting')
    emitConnection('connected')
    expect(session().phase).toBe('active')
  })

  it('mídia desconectada de vez encerra com aviso', async () => {
    const { controller, emitConnection } = rig()
    await controller.joinChannel({ id: 'ch1', name: 'Geral', serverId: 's1' })
    emitConnection('disconnected')
    await Promise.resolve()
    expect(session().phase).toBe('idle')
    expect(useCallNoticeStore.getState().message).toBe('A conexão com a chamada caiu.')
  })

  it('quem fala vai para a store', async () => {
    const { controller, emitSpeakers } = rig()
    await controller.joinChannel({ id: 'ch1', name: 'Geral', serverId: 's1' })
    emitSpeakers(['u1'])
    expect(useSpeakingStore.getState().speaking).toEqual(['u1'])
  })
})

describe('applyAudio', () => {
  it('fone liga/desliga o áudio que chega e o microfone', async () => {
    let deafened = false
    const { controller, media, deps } = rig({ controls: () => ({ muted: deafened, deafened }) })
    await controller.joinChannel({ id: 'ch1', name: 'Geral', serverId: 's1' })
    deafened = true
    await controller.applyAudio()
    expect(media.setListening).toHaveBeenLastCalledWith(false)
    expect(media.setMicEnabled).toHaveBeenLastCalledWith(false)
    expect(deps.ws.send).toHaveBeenLastCalledWith('call:voice', { call_id: 'c1', muted: true, deafened: true })
  })

  it('sem chamada não faz nada', async () => {
    const { controller, media } = rig()
    await controller.applyAudio()
    expect(media.setMicEnabled).not.toHaveBeenCalled()
  })
})

describe('transmissão de tela', () => {
  it('ligar e desligar a minha transmissão: avisa a mídia, guarda o estado e toca o som ao ligar', async () => {
    const { controller, media } = rig()
    await controller.toggleScreenShare()
    expect(media.setScreenShareEnabled).toHaveBeenLastCalledWith(true)
    expect(useScreenShareStore.getState().sharing).toBe(true)
    expect(playSound).toHaveBeenLastCalledWith('liveStart')
    await controller.toggleScreenShare()
    expect(media.setScreenShareEnabled).toHaveBeenLastCalledWith(false)
    expect(useScreenShareStore.getState().sharing).toBe(false)
  })

  it('captura de tela negada: avisa e fica desligada', async () => {
    const { controller, media } = rig()
    media.setScreenShareEnabled.mockRejectedValue(new Error('NotAllowedError'))
    await controller.toggleScreenShare()
    expect(useScreenShareStore.getState().sharing).toBe(false)
    expect(useCallNoticeStore.getState().message).toMatch(/Não foi possível transmitir a tela/)
  })

  it('a lista de quem transmite vai para a store; som quando outra pessoa começa ou para (eu não conto)', async () => {
    const { emitScreens } = rig({ meId: () => 'me' })
    jest.mocked(playSound).mockClear()
    emitScreens(['me'])
    expect(playSound).not.toHaveBeenCalled()
    emitScreens(['me', 'u1'])
    expect(playSound).toHaveBeenLastCalledWith('liveStart')
    emitScreens(['me'])
    expect(playSound).toHaveBeenLastCalledWith('liveEnd')
    expect(useScreenShareStore.getState().sharers).toEqual(['me'])
  })

  it('assistir pede a faixa à mídia; trocar de transmissão larga a anterior; parar zera', () => {
    const { controller, media } = rig()
    controller.watchScreen('u1')
    expect(media.watchScreen).toHaveBeenLastCalledWith('u1', true)
    expect(useScreenShareStore.getState().watching).toBe('u1')
    controller.watchScreen('u2')
    expect(media.watchScreen).toHaveBeenCalledWith('u1', false)
    expect(media.watchScreen).toHaveBeenLastCalledWith('u2', true)
    controller.watchScreen(null)
    expect(media.watchScreen).toHaveBeenLastCalledWith('u2', false)
    expect(useScreenShareStore.getState().watching).toBeNull()
  })

  it('sair da chamada zera as transmissões', async () => {
    const { controller } = rig()
    await controller.joinChannel({ id: 'ch1', name: 'Geral', serverId: 's1' })
    useScreenShareStore.getState().setSharing(true)
    await controller.leave()
    expect(useScreenShareStore.getState().sharing).toBe(false)
  })
})
